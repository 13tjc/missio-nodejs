module.exports = new require('knex')({
    client: 'mysql',
    connection: {
        host: process.env.DB || 'localhost',
        user: 'root',
        port: '3306',
        password: 'unx4Mh3zHVTPyBEt',
        database: 'missio'
    }
});


/*
password: 'rd112358',
database: 'missio'
*/ 