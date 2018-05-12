let config = require('../../config');

let cla = require('./cla');
let claModel = require('../documents/cla')

let github = require('./github');
let nodemailer = require('nodemailer');
let logger = require('../services/logger');

function sendMail(claData, claText) {
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.server.smtp.auth.user,
        pass: config.server.smtp.auth.pass,
      }
    });

    let textData = JSON.stringify(claData, null, 4);
    let htmlData = '';
    try {
      let custom_fields = JSON.parse(claData['custom_fields']);
      htmlData += custom_fields['agreement'] ? 'I AGREE<br/>\n' : '';
      htmlData += 'Name: ' + custom_fields['name'] + '<br/>\n';
      htmlData += 'GitHub ID: ' + claData['user'] + '<br/>\n';
      htmlData += 'Email: ' + custom_fields['email'] + '<br/>\n';
      htmlData += 'Date: ' + claData['created_at'] + '\n';
    } catch (error) {
      logger.error(error, 'Error building HTML message for CLA');
      htmlData = textData;
    }

    var mailOptions = {
      from: config.server.smtp.auth.user,
      to: config.server.notification.email,
      subject: 'CLA Signed' + (claData['user'] ? ' by ' + claData['user'] : ''),
      text: textData,
      html: claText + htmlData,
    };
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        logger.error(error, 'Error sending CLA email for %s', claData['user']);
      } else {
        logger.info('CLA Email sent: ' + info.response);
      }
    });
}

function sendClaToEmail(claData) {
    let args = {
        gist: claData.gist_url,
        /* TODO reintroduce if we ever support basic auth
        basicAuth: {
            user: config.server.github.user,
            pass: config.server.github.pass
        },
        */
        token: config.server.github.token
    }
    cla.getGist(args, function (err, resp) {
        if (err) {
            logger.error(err, 'Error getting gist %s', claData.gist_url);
            return;
        }
        let files = resp.files;
        let file;
        for (let name in files) {
            if (name != 'metadata') {
                file = files[name];
            }
        }
        let args = {
            obj: 'misc',
            fun: 'renderMarkdown',
            arg: {
                text: file.content
            },
            /*
            basicAuth: {
                user: config.server.github.user,
                pass: config.server.github.pass
            },
            */
            token: config.server.github.token
        };

        github.call(args, function (error, response) {
            if (error) {
                logger.error(error, 'Error getting markdown from Github');
            }
            if (!response || response.statusCode !== 200) {
                let callback_error = response && response.message ? response.message : error;
                if (callback_error) {
                    logger.error(callback_error, 'Error getting markdown from Github');
                }
            }
            let content = response.body || response.data || response || '';
            sendMail(claData, content);
        });
    });
}

module.exports = {
    sendClaToEmail: sendClaToEmail,
    init: function() {
        claModel.listen(function(doc) {
            try {
                sendClaToEmail(doc);
            } catch (error) {
                logger.error(error, 'Error performing CLA email notification');
            }
        });
        return this;
    }
};
