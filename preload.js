const sina_js_prefix = 'hq_str_';

const objType = {
    '11': 'A股',
    '12': 'B股',
    '13': '权证',
    '14': '期货',
    '15': '债券',
    '21': '开基',
    '22': 'ETF',
    '23': 'LOF',
    '24': '货基',
    '25': 'QDII',
    '26': '封基',
    '31': '港股',
    '32': '窝轮',
    '33': '港指数',
    '41': '美股',
    '42': '外期',
    '71': '外汇',
    '72': '基金',
    '73': '新三板',
    '74': '板块',
    '75': '板块',
    '76': '板块',
    '77': '板块',
    '78': '板块',
    '79': '板块',
    '80': '板块',
    '81': '债券',
    '82': '债券',
    '85': '期货',
    '86': '期货',
    '87': '期货',
    '88': '期货',
    '100': '指数',
    '101': '基金',
    '102': '指数',
    '103': '英股',
    '104': '国债',
    '105': 'ETF',
    '106': 'ETF',
    '107': 'msci',
    '111': 'A股',
    '120': '债券'
};

const today = getDate();

function getDate() {
    // 获取当前日期
    const date = new Date();

    // 获取当前月份
    let nowMonth = date.getMonth() + 1;

    // 获取当前是几号
    let strDate = date.getDate();

    // 添加分隔符“-”
    const seperator = "-";

    // 对月份进行处理，1-9月在前面添加一个“0”
    if (nowMonth >= 1 && nowMonth <= 9) {
        nowMonth = "0" + nowMonth;
    }

    // 对月份进行处理，1-9号在前面添加一个“0”
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }

// 最后拼接字符串，得到一个格式为(yyyy-MM-dd)的日期
    return date.getFullYear() + seperator + nowMonth + seperator + strDate;
}

function get(url) {
    const httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', url, false);
    httpRequest.send();
    return httpRequest.responseText;
}

function formatStr(str, share) {
    if (str.length === 0) {
        return false;
    }

    share = isNaN(share) ? 0 : share;

    let array = str.split(',');

    if (array.length === 6) { // 基金
        //诺安成长混合,1.804,2.249,1.848,-2.38,2021-01-29
        const [jjmc, dwjz, ljjz, zrjz, zdf, sjrq] = array;
        return {
            name: jjmc,
            profitRate: zdf,
            profit: ((dwjz - zrjz) * share).toFixed(2),
            isToday: sjrq <= today
        };
    } else {
        const [gpmc, jrkpj, zrspj, dqjg] = array;
        return {
            name: gpmc,
            profitRate: ((dqjg - zrspj) / zrspj * 100).toFixed(2),
            profit: ((dqjg - zrspj) * share).toFixed(0),
            isToday: true
        }
    }
}

function getData() {
    let data = getListData();
    const all = [{}];
    let sum = 0;

    data.sort(function (m, n) {

        if (m.type > n.type) {
            return 1;
        } else if (m.type < n.type) {
            return -1;
        }

        return m.code > n.code ? 1 : -1; //升序
    });

    const list_str = data.map(v => v.s_code).join(',');
    const jsCode = get('http://hq.sinajs.cn/list=' + list_str);

    eval(jsCode);

    data.forEach(v => {
        let tmp = formatStr(eval(sina_js_prefix + v.s_code), v.share);

        if (!tmp) return;
        sum += parseInt(tmp.profit);
        all.push({
            title: v.code + ' ' + tmp.name + (tmp.isToday ? ' ✅' : ''),
            description: tmp.profitRate + '% ￥ ' + tmp.profit,
            icon: tmp.profit >= 0 ? 'up.png' : 'down.png',
            s_code: v.s_code
        });
    });

    all[0] = {
        title: '今日总收益',
        description: '￥ ' + sum,
        icon: sum >= 0 ? 'up.png' : 'down.png'
    };

    return all;
}

function search(word) {
    if (word === '') {
        return [];
    }

    const jsCode = get('http://suggest3.sinajs.cn/suggest/key=' + word);
    eval(jsCode);

    let vName = 'suggestvalue';
    const list = eval(vName).split(';').map(v => {
        let [, type, code, s_code, name] = v.split(',');
        return {
            name: name,
            type: type,
            code: code,
            s_code: s_code
        };
    });

    let res = [];
    for (let i = 0; i < list.length; i++) {
        res.push({
            title: list[i]['code'] + (checkListData(list[i]['s_code']) ? ' ✅' : ''),
            description: list[i]['name'],
            data: list[i]
        });
    }

    return res;
}

function getListData() {
    let data = utools.db.get('my_list_data');

    if (!data) {
        utools.db.put({
            _id: 'my_list_data',
            data: JSON.stringify({})
        });
        return [];
    }

    return Object.values(JSON.parse(data.data));
}

function setListData(v) {
    let data = utools.db.get('my_list_data');

    if (!data) {
        let tmp = {};
        tmp[v.s_code] = v;
        utools.db.put({
            _id: 'my_list_data',
            data: JSON.stringify(tmp)
        });
        return;
    }

    let list = JSON.parse(data.data);
    list[v.s_code] = v;
    data.data = JSON.stringify(list);

    utools.db.put(data);
}


function delListData(sCode) {
    let data = utools.db.get('my_list_data');

    if (!data) {
        return;
    }

    let list = JSON.parse(data.data);
    delete list[sCode];
    data.data = JSON.stringify(list);

    utools.db.put(data);
}

function checkListData(sCode) {
    let data = utools.db.get('my_list_data');

    if (!data) {
        return false;
    }

    let list = JSON.parse(data.data);

    return typeof list[sCode] !== 'undefined';
}

function setShareListData(sCode, share) {

    let data = utools.db.get('my_list_data');

    if (!data) {
        return;
    }

    let list = JSON.parse(data.data);

    list[sCode].share = share;
    data.data = JSON.stringify(list);

    utools.db.put(data);
}

let globalData = {};

window.exports = {
    "investment": { // 注意：键对应的是 plugin.json 中的 features.code
        mode: "list",  // 列表模式
        args: {
            // 进入插件时调用（可选）
            enter: (action, callbackSetList) => {
                // 如果进入插件就要显示列表数据
                callbackSetList(getData())
            },
            search: (action, searchWord, callbackSetList) => {
                globalData['search'] = searchWord;
            },
            select: (action, itemData, callbackSetList) => {
                if (isNaN(globalData['search'])) {
                    return;
                }
                const share = parseFloat(globalData['search']);

                const sCode = itemData.s_code;

                if (share === -1) {
                    delListData(sCode)
                } else {
                    if (typeof sCode === 'undefined') {
                        return;
                    }
                    setShareListData(sCode, share);
                }
                callbackSetList(getData());
                utools.setSubInputValue('')
                utools.subInputFocus()
            },
            placeholder: "输入份额，选中基金或股票，即可设置，输入 -1 表示删除"
        }
    },
    "investment_add": {
        mode: "list",
        args: {
            placeholder: "查询股票或基金代码添加",
            search: (action, searchWord, callbackSetList) => {
                callbackSetList(search(searchWord))
            },
            select: (action, itemData, callbackSetList) => {
                const data = itemData.data;
                setListData(data);
                utools.redirect('继续添加我的投资', '');
            }
        }
    },
}