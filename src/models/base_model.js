const { Model } = require('objection');

class BaseModel extends Model {
    static get tableName() {
        throw new Error('tableName method must be overridden in descendants!')
    }

    static get modelPaths() {
        return [__dirname];
    }

    // may need this
    // static get columnNameMappers() {
    //     // http://vincit.github.io/objection.js/#columnnamemappers
    // }
}

module.exports = BaseModel;
