const express = require('express');
const sqlite = require('sqlite3');

const apiRouter = express.Router();
const db = new sqlite.Database('../berryharvest20192020.sqlite', (err)=>{
    if(err) {
        return console.error(err.message);
    }
    console.log(`Connected to SQlite database`);
});

let berryVarIdList= [];
let blockNameList = [];

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

apiRouter.post('/record/', (req,res,next)=> {
    console.log(`we are going to update ${req.body.entryid}`);
    db.run(`UPDATE BerryRecords
    SET
        DateTime = '${req.body.datetime}',
        BerryTypeNumber = ${req.body.berrytype},
        BerryBlockNumber = ${req.body.blockid},
        BerryVarietyNumber = ${req.body.varietyid},
        BerryGrade = '${req.body.berrygrade}',
        BatchNum = '${req.body.batchnum}', 
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
        Comments = '${req.body.qccomments}'
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

apiRouter.post('/formsubmit',(req,res,next)=>{
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
        '${req.body.batchnum}',
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
        '${req.body.qccomments}'
    )`,
    function(error) {
        console.log(this.lastID);
        if(error) {
            console.log(`Here`)
            console.log(error)
            return res.sendStatus(500);
        }
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
    db.all(`SELECT * FROM DetailView`, 
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
    db.all(`SELECT
        BerryTypeName,
        SeasonWeight,
        DayWeight
    FROM
        (SELECT
            BerryTypes.BerryTypeName,
            SUM(VarietyInBlockSum) AS SeasonWeight
        FROM
            SeasonSumForVarietyInBlockViewSinceAug
        INNER JOIN BerryTypes ON
            SeasonSumForVarietyInBlockViewSinceAug.BerryTypeNumber = BerryTypes.BerryTypeNumber
        GROUP BY
            BerryTypeName) t1
    LEFT JOIN
        (SELECT
            BerryType,
            SUM(NettWeight) AS DayWeight
        FROM
            DetailView
        WHERE
            strftime('%Y-%m-%d',DateTime)='${req.params.date}'
        GROUP BY
            BerryType) t2
    ON
        t1.BerryTypeName = t2.BerryType`,
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