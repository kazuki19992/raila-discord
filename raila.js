// Raila-System
// Railway-Delay-Infomation-System

const request = require("request");
const moment = require("moment");
const fs = require("fs");
const current = moment();

require("dotenv").config()
const env = process.env;
// console.log(env.WEBHOOK_URL)

let beforeData = [];
let fetchedData = [];

const fetchJson = async () => {
  // 列車遅延情報を取得
  const reqOpt = {
    url: 'https://tetsudo.rti-giken.jp/free/delay.json',
    json: true,
  };

  await request.get(reqOpt, (err, res, body) => {
    if (err) {
      throw err;
    }

    fetchedData = body;
  })
}

// 対象の路線データが存在するか確認
let config = {};
const search = () => {
  config = readJson();

  console.log(config);
  const sendData = [];

  for(const record of config.records){
    for(const f of fetchedData){
      if (f.name === record.name && f.company === record.company) {
        // 遅延情報に登録されていた場合

        if (beforeData.length === 0) {
          // 新規データの場合
          const json = {
            name: f.name,
            users: record.users
          }
          sendData.push(json);

        } else {
          // 以前のデータが存在した場合
          for (const b of beforeData) {
            if (b.name !== f.name) {
              // 通知してなかったら
              const json = {
                name: f.name,
                users: record.users
              }
              sendData.push(json);
            }
          }

        }
      }
    }
  }
  console.log("beforeData:", beforeData);

  beforeData.push(...sendData);
  return [...sendData];
}

// JSONファイルの読み込み
const readJson = () => {
  return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
}

// 送信
const post = async (sendData) => {
  for (const s of sendData) {

    let seguFlg = false;
    if (s.users.indexOf("せぐ") !== -1) {
      seguFlg = true;
    }

    const mention = []
    for(const u of s.users) {
      mention.push(`<@!${config.users[u].uid}>`);
    }
    const data = {
      "content": mention.join(' ') + "\n"
                  + getMsg(seguFlg, s),
    };

    const postOpt = {
      uri: env.WEBHOOK_URL,
      form: data,
      json: true
    };
    await request.post(postOpt, (err, res, body) => {
      if (err) {
        throw err;
      }
      console.log("送信したよ");
    })
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
const getMsg = (seguFlg, s) => {
  const msgCommon = [
    "おはよっ！！眠くない？？\n今 " + s.name + " が遅れてるんだって！！気をつけてね！",
  ]

  const seguMsg = [
    "おはよっ！\n今 " + s.name + " が遅れてるらしいよ！！気をつけてね！おにーちゃん！おねーちゃん！",
    "おにーちゃん、おねーちゃんおはよ！！\nなんか " + s.name + " が遅れてるんだって！会社に遅刻しないようにね！"
  ]

  const other = [
    "おにーちゃんおはよっ！\n" + s.name + " が遅れてるって聞いたんだけど…… 会社間に合いそう？"
  ]

  if (seguFlg) {
    switch(getRandomInt(2)){
      case 0: {
        return msgCommon[getRandomInt(msgCommon.length)]
      }
      case 1: {
        return seguMsg[getRandomInt(seguMsg.length)]
      }
    }
  } else {
    switch(getRandomInt(2)){
      case 0: {
        return msgCommon[getRandomInt(msgCommon.length)]
      }
      case 1: {
        return other[getRandomInt(other.length)]
      }
    }
  }
}
setInterval(async () => {
  // 10分おきに取得して通知

  if (current.format("HH") >= 7 && current.format("HH") < 9) {
    await fetchJson();

    if (fetchedData.length) {
      const sendData = search();

      if (sendData) {
        await post(sendData);
      }
    }
  }


}, (1000 * 10));

