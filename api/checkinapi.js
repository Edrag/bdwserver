const express = require('express');
const sqlite = require('sqlite3');
const Ajv = require('ajv').default;

const apiRouter = express.Router();
const db = new sqlite.Database('./berryharvest.sqlite', (err)=>{
    if(err) {
        return console.error(err.message);
    }
    console.log(`Connected to SQlite database`);
    db.all(`SELECT 
        name
    FROM 
        sqlite_master 
    WHERE 
        type ='table' AND 
        name NOT LIKE 'sqlite_%';`,
        (error, tables)=>{
            if(error) {
                return console.error(error.message);
            }
            console.log(tables);
        }
    );
});

let berryVarIdList= [];
let blockNameList = [];
//"$schema": "http://json-schema.org/draft/2019-09/schema#",
const formSchema = {
    "type":"object",
    "properties": {
        "entryid": {"type":["string","null"],"maxLength":16},
        "datetime": {"type":"string", "maxLength":50},
        "berrytype": {"type":"string", "maxLength":6},
        "blockid": {"type":"string", "maxLength":6},
        "varietyid": {"type":"string", "maxLength":6},
        "berrygrade": {"type":"string", "maxLength":6},
        "batchnum": {"type":["string","null"], "maxLength":6},
        "numofcrates": {"type":"string", "maxLength":6},
        "grossweight": {"type":"string", "maxLength":6},
        "crateindividualweight": {"type":"string", "maxLength":6},
        "nettweight": {"type":"string", "maxLength":6},
        "qcteam": {"type":["string","null"],"default":null},
        "qctemp": {"type":["string","null"], "maxLength":6},
        "qcbrix": {"type":["string","null"], "maxLength":6},
        "qcgpberry": {"type":["string","null"], "maxLength":6},
        "qccolour": {"type":["string", "null"], "maxLength":20},
        "qcfeel": {"type":["string", "null"], "maxLength":20},
        "qccomments": {"type":["string","null"],"maxLength":50},
    },
    "additionalProperties":false,
    "required":["datetime","berrytype","blockid","varietyid","berrygrade","numofcrates","grossweight","crateindividualweight","nettweight"]
}

const ajv = new Ajv();
const validate = ajv.compile(formSchema);

apiRouter.use('/post/', (req,res,next)=>{
    //&&(key!=="batchnum"&&key!=="qccomments")
    Object.keys(req.body).forEach((key)=>{
        if(req.body[key]==='') {
            req.body[key]=null;
        };
    });

    let valid = validate(req.body);
    if(!valid) {
        console.log(validate.errors);
        return next(validate.errors);
    }

    console.log(`Validation:`);
    console.log(req.body);
    next();
});

apiRouter.get('/record/:id', (req,res,next) =>{
    db.get(`SELECT * FROM BerryRecords WHERE EntryId=${req.params.id}`,
        (error,row)=>{
            if(error) {
                next(error);
            } else {
                console.log(row);
                res.status(200).json(row);
            }
        }
    )
});

apiRouter.post('/post/record', (req,res,next)=> {
    console.log(`we are going to update ${req.body.entryid}`);
    db.run(`UPDATE BerryRecords
    SET
        DateTime = '${req.body.datetime}',
        BerryTypeNumber = ${req.body.berrytype},
        BerryBlockNumber = ${req.body.blockid},
        BerryVarietyNumber = ${req.body.varietyid},
        BerryGrade = '${req.body.berrygrade}',
        BatchNum = ${typeof(req.body.batchnum)==="string"?`'${req.body.batchnum}'`:req.body.batchnum}, 
        NumOfCrates = ${req.body.numofcrates},
        GrossWeight = ${req.body.grossweight},
        IndivCrateWeight = ${req.body.crateindividualweight},
        NettWeight = ${req.body.nettweight},
        Team = ${req.body.qcteam},
        Temperature = ${req.body.qctemp},
        Brix = ${req.body.qcbrix},
        GramPerBerry = ${req.body.qcgpberry},
        Colour = '${req.body.qccolour}',
        Feel = '${req.body.qcfeel}',
        Comments = ${typeof(req.body.qccomments)==="string"?`'${req.body.qccomments}'`:req.body.qccomments}
    WHERE
        EntryId = ${req.body.entryid}`,
        (error)=>{  
            if(error) {
                next (error);
            } else {
                res.status(204).redirect('/');
            }
        }
    )
})

apiRouter.get('/berrytypes', (req,res,next)=>{
    db.all('SELECT * FROM BerryTypes', (error,names)=>{
        if(error) {
            next(error);
        } else {
            console.log(names);
            res.status(200).json({berryTypes: names});
        }
    })
});

apiRouter.get('/blocks/:berrytype',(req,res,next)=>{
    console.log(req.params.berrytype)

    db.all('SELECT BerryVarietyId FROM BerryVarieties WHERE BerryTypeNumber = $berryType ',
        {$berryType:req.params.berrytype},
        (error, berryVarIds)=>{
            if (error) {
                next(error)
            } else {
                berryVarIds.map((key,val)=>{
                    berryVarIdList.push(key.BerryVarietyId);
                });
                console.log(berryVarIdList);
                berryVarIdList = berryVarIdList.join();
                db.all(`SELECT DISTINCT BlockNumber FROM BerryVarietyInBlock WHERE BerryVarietyId IN (${berryVarIdList})`,
                    (error,blockNumbers)=>{
                        if(error) {
                            next(error);
                        } else {
                            blockNumbers.map((key,val)=>{
                                blockNameList.push(key.BlockNumber);
                            });
                            console.log(blockNameList);
                            blockNameList = blockNameList.join();
                            db.all(`SELECT * FROM BlockNames WHERE BlockNumber IN (${blockNameList})`,
                                (error,blocks)=>{
                                    if (error) {
                                        next(error);
                                    } else {
                                        console.log(blocks);
                                        berryVarIdList= [];
                                        blockNameList = [];
                                        res.status(200).json({berryBlocks:blocks});
                                    }
                                }
                            );  
                        }
                    }
                );
            }
        }
    );
});

apiRouter.get('/varieties/:blocknum/:berrytype', (req,res,next)=>{
    db.all(`SELECT BerryVarietyId FROM BerryVarietyInBlock WHERE BlockNumber = ${req.params.blocknum}`,
        (error,berryVarIds)=>{
            console.log(berryVarIds);
            if(error) {
                next(error);
            } else {
                berryVarIds.map((key,val)=>{
                    berryVarIdList.push(key.BerryVarietyId);
                });
                console.log(berryVarIdList);
                berryVarIdList = berryVarIdList.join();
                db.all(`SELECT * FROM BerryVarieties WHERE BerryVarietyId IN (${berryVarIdList}) AND BerryTypeNumber=${req.params.berrytype}`,
                    (error, varieties) => {
                        if (error) {
                            next(error);
                        } else {
                            console.log(varieties);
                            berryVarIdList =[];
                            res.status(200).json({berryVarieties:varieties})
                        }
                    }
                )
            }
        }
    )
});

apiRouter.post('/post/formsubmit',(req,res,next)=>{
    console.log(`Submission:`);
    console.log(req.body);
    db.run(`INSERT INTO BerryRecords (
        DateTime,
        BerryTypeNumber,
        BerryBlockNumber,
        BerryVarietyNumber,
        BerryGrade,
        BatchNum, 
        NumOfCrates,
        GrossWeight,
        IndivCrateWeight,
        NettWeight,
        Team,
        Temperature,
        Brix,
        GramPerBerry,
        Colour,
        Feel,
        Comments
    ) VALUES (
        '${req.body.datetime}',
        ${req.body.berrytype},
        ${req.body.blockid},
        ${req.body.varietyid},
        '${req.body.berrygrade}',
        ${typeof(req.body.batchnum)==="string"?`'${req.body.batchnum}'`:req.body.batchnum},
        ${req.body.numofcrates},
        ${req.body.grossweight},
        ${req.body.crateindividualweight},
        ${req.body.nettweight},
        ${req.body.qcteam},
        ${req.body.qctemp},
        ${req.body.qcbrix},
        ${req.body.qcgpberry},
        '${req.body.qccolour}',
        '${req.body.qcfeel}',
        ${typeof(req.body.qccomments)==="string"?`'${req.body.qccomments}'`:req.body.qccomments}
    )`,
    function(error) {
        if(error) {
            console.log(`Here`)
            console.log(error)
            return res.sendStatus(500);
        }
        console.log(this.lastID);
        db.get(`SELECT * FROM BerryRecords WHERE EntryId = ${this.lastID}`,
            (error,row)=>{
                if(error) {
                    console.log(`here2`)
                    return res.sendStatus(500)
                } else {
                    console.log(row);
                    res.status(201).redirect('/berrycheckin');
                }
            }
        );
        }
    );

});

apiRouter.get('/last5', (req,res,next)=>{
    //console.log(`Here at last5 request`);
    db.all(`SELECT * FROM DetailView LIMIT 200`, 
        (error, rows)=>{
            if(error) {
                console.log(error)
                next(error);
            } else {
                //console.log(rows);
                res.status(200).json({berryrecords:rows});
            }
        }
    );
});

apiRouter.get('/sumday/:date', (req,res,next)=>{
    console.log(`Here sumday`);
    db.all(`SELECT
    BerryTypeName,
    SeasonWeight,
    DayWeightClass1,
    DayWeightClassOther
FROM
    (SELECT
        BerryTypes.BerryTypeName,
        ROUND(SUM(VarietyInBlockSum),2) AS SeasonWeight
    FROM
        SeasonSumForVarietyInBlockViewSinceAug
    INNER JOIN BerryTypes ON
        SeasonSumForVarietyInBlockViewSinceAug.BerryTypeNumber = BerryTypes.BerryTypeNumber
    GROUP BY
        BerryTypeName) t1
LEFT JOIN
    (SELECT
        BerryType,
        SUM(NettWeight) AS DayWeightClass1
    FROM
        DetailView
    WHERE
        strftime('%Y-%m-%d',DateTime)='${req.params.date}'
        AND
        DetailView.BerryGrade =1
    GROUP BY
        BerryType) t2
ON
    t1.BerryTypeName = t2.BerryType
LEFT JOIN
    (SELECT
        BerryType,
        SUM(NettWeight) AS DayWeightClassOther
    FROM
        DetailView
    WHERE
        strftime('%Y-%m-%d',DateTime)='${req.params.date}'
        AND
        DetailView.BerryGrade =2
    GROUP BY
        BerryType) t3
ON
    t1.BerryTypeName = t3.BerryType`,
        (error,rows)=>{
            if(error) {
                console.log(error);
                next(error);
            } else {
                console.log(rows);
                res.status(200).json({sumrecords:rows})
            }
        }
    );
});

apiRouter.delete('/delrecord/:id', (req,res,next)=>{
    db.run(`DELETE FROM 
        BerryRecords
    WHERE
        EntryId = ${req.params.id}`,
        (error)=>{
            if(error) {
                console.log(error)
                next(error);
            } else {
                console.log(`row deleted`);
                res.sendStatus(204);
            }
        })
})

module.exports = apiRouter;

/*apiRouter.use('/',(req,res,next)=>{
    db.run(`CREATE VIEW IF NOT EXISTS DetailView AS SELECT
        EntryId,
        DateTime,
        BerryTypes.BerryTypeName AS BerryType,
        BlockNames.BlockName AS BlockName,
        BerryVarieties.BerryVarietyName AS VarietyName,
        BerryGrade,
        BatchNum,
        GrossWeight,
        NumOfCrates,
        IndivCrateWeight,
        NettWeight,
        Team,
        Temperature,
        Brix,
        GramPerBerry,
        Colour,
        Feel,
        Comments
    FROM BerryRecords
    INNER JOIN BerryTypes ON BerryTypes.BerryTypeNumber = BerryRecords.BerryTypeNumber
    INNER JOIN BlockNames ON BlockNames.BlockName = BerryRecords.BerryBlockNumber
    INNER JOIN BerryVarieties ON BerryVarieties.BerryVarietyName = BerryRecords.BerryVarietyNumber;`,
    (error) => {
        if(error) {
            console.log(error);
            next(error);
        } else {
            next();
        }
    });
})*/