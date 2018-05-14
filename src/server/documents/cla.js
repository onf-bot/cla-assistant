let mongoose = require('mongoose');
let logger = require('../services/logger');
mongoose.Promise = require('q').Promise;

let CLASchema = mongoose.Schema({
    created_at: Date,
    end_at: Date,
    custom_fields: String,
    gist_url: String,
    gist_version: String,
    owner: String,
    ownerId: String,
    repo: String,
    repoId: String,
    org_cla: Boolean,
    user: String,
    userId: String,
});

let index = {
    repo: 1,
    repoId: 1,
    owner: 1,
    ownerId: 1,
    user: 1,
    gist_url: 1,
    gist_version: 1,
    org_cla: 1
};
let indexOptions = {
    unique: true,
    background: true
};

let observers = []
CLASchema.post('save', function(doc) {
    logger.info('New CLA entry: %s', JSON.stringify(doc));
    for (i in observers) {
        try {
            observers[i](doc);
        } catch (error) {
            logger.error(error, 'Error dispatching post-CLA save notification');
        }
    }
});

let CLA = mongoose.model('CLA', CLASchema);

CLA.collection.dropAllIndexes(function (err, results) {
    if (err) {
        logger.warn('CLA collection dropAllIndexes error: ', err);
        logger.warn('dropAllIndexes results: ', results);
    }
});
CLA.collection.createIndex(index, indexOptions);

module.exports = {
    CLA: CLA,
    listen: function (fn) {
        observers.push(fn);
    }
};
