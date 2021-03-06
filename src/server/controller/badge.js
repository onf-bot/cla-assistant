let express = require('express'),
    ejs = require('ejs'),
    fs = require('fs'),
    crypto = require('crypto');

//api
let cla = require('./../api/cla');

//////////////////////////////////////////////////////////////////////////////////////////////
// Badge controller
//////////////////////////////////////////////////////////////////////////////////////////////

let router = express.Router();


router.all('/pull/badge/:signed', function (req, res) {
    let tmp = fs.readFileSync('src/server/templates/badge_not_signed.svg', 'utf-8');
    let hash = crypto.createHash('md5').update('pending', 'utf8').digest('hex');
    let badgeText = 'Please sign our CLA!';

    if (req.params.signed === 'signed') {
        tmp = fs.readFileSync('src/server/templates/badge_signed.svg', 'utf-8');
        hash = crypto.createHash('md5').update('signed', 'utf8').digest('hex');
    }

    if (req.get('If-None-Match') === hash) {
        return res.status(304).send();
    }

    let svg = ejs.render(tmp, {
        text: badgeText
    });

    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'no-cache');
    res.set('Etag', hash);
    res.send(svg);
});


router.all('/readme/badge/:owner/:repo', function (req, res) {
    let args = {
        owner: req.params.owner,
        repo: req.params.repo
    };
    let style = req.query && req.query.style ? req.query.style : undefined;
    let label = req.query && req.query.label ? req.query.label : undefined;
    let colorB = req.query && req.query.colorB ? req.query.colorB : undefined;
    let logo = req.query && req.query.logo ? req.query.logo : undefined;
    let redirect = function (count) {
        let url = 'https://img.shields.io/badge/CLAs signed-' + count + '-0594c6.svg?';
        url = style ? url + '&style=' + style : url;
        url = label ? url + '&label=' + label : url;
        url = colorB ? url + '&colorB=' + colorB : url;
        url = logo ? url + '&logo=' + logo : url;
        res.redirect(url);
    };
    req.args = args;
    cla.countCLA(req, function (err, count) {
        if (err || !count) {
            redirect(0);

            return;
        }
        redirect(count);
    });
});

module.exports = router;
