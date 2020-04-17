const bodyParser = require('body-parser');
const cors = require('cors');
const errorHandler = require('errorhandler');
const morgan = require('morgan');
const express = require('express');

const apiRouter = require('./api/checkinapi');

const app = express();

const PORT = process.env.PORT || 4001;

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

//app.use('/berrycheckin', express.static('./berrycheckin/build/'));
app.use(express.static('./bdwmainpage/build/'))
app.use('/api_bci',apiRouter);

/*app.get('/berrycheckin_re', (req,res,next) =>{
    console.log(`Here`);
    res.status(200).redirect('/berrycheckin');
});*/

app.use(errorHandler());

app.listen(PORT,()=>{console.log(`Server running on ${PORT}`)});

module.exports = app;