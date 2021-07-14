const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const dbMysql2 = require("./db/database");

const app = express();
const httpServer = http.createServer(app);
const io = socketio(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    }
});
const port = 3012;

io.on('connect', (socket) => {

    //歡應通知
    socket.emit('Message', '歡迎進入,請開始出價');

    //廣播有人進入此頁面
    socket.broadcast.emit('Message', '有人進入此頁面')
    // console.log('hi')
    //出價
    socket.on('bidPrice', async ({ inputbidPrice, auc_Id, memberid }) => {

        // io.emit('Message', inputbidPrice)
        //新增此次出價人 金額 時間 在出價表上
        await executeInsertSQL(inputbidPrice, auc_Id, memberid)
        
        //更新目前最高價格
        await executeupdateSQL(inputbidPrice,auc_Id)

        //拉取該表所有該商品的出價資訊
        let auc_info = await executeSQL(auc_Id)
        console.log(auc_info)

        io.emit('Message', {inputbidPrice,auc_info})


    })

    //測試
    socket.on('test', async ({ auc_Id, memberid }) => {
        console.log(auc_Id, memberid)
        let sql = `INSERT INTO aucbuyerinfo (Member_Id,auction_id,Price)
        VALUES ( ${memberid},${auc_Id},8000)`

        let a = await executeInsertSQL(sql)
        // console.log(a)
    })

    socket.on('disconnect', (msg) => {
        io.emit('Message', 'a user has left the page')
        console.log('io disconnected');
    });

});

httpServer.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});

//查詢目前出價的 人 金額
async function executeSQL(auc_Id) {
    let sql_s = `SELECT aucId,aucPriceNow,Price,aucCreated_at,name
        FROM auctionitems
        LEFT JOIN aucbuyerinfo
        ON auctionitems.aucId = aucbuyerinfo.auction_id
        LEFT JOIN users
        ON users.id = aucbuyerinfo.Member_Id
        WHERE auction_id = ${auc_Id}
        ORDER BY price DESC`
    const [rows, fields] = await dbMysql2.promisePool.query(sql_s);
    const rowsA = Object.values(JSON.parse(JSON.stringify(rows)))
    return rowsA
}

//出價表插入出價人 金額 時間
async function executeInsertSQL(inputbidPrice, auc_Id, memberid) {
    let sql_i = `INSERT INTO aucbuyerinfo (Member_Id,auction_id,Price)
        VALUES ( ${memberid},${auc_Id},${inputbidPrice})`
    const a = await dbMysql2.promisePool.query(sql_i);
    // console.log("test", a)
}

async function executeupdateSQL(inputbidPrice,auc_Id){
    let sql_u = `UPDATE auctionitems 
    SET aucPriceNow = ${inputbidPrice}
    WHERE aucId = ${auc_Id}`
    let c = await dbMysql2.promisePool.query(sql_u);
}

//socket.on 監聽訊息(接收訊息)
//socket.emit  發訊息給客戶端或server端(單獨一人)
//socket.broadcast.emit 發訊息給客戶端自己以外的所有人
//io.emit 發訊息給所有人   舉例: io.emit('message',formatMessage(`${user.username}`,msg))