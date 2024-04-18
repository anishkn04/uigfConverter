//I will refer to "paimon.moe" as "PMOE" for the sake of convenience

async function convert() {
    const weapons = await getWeapons();
    const characters = await getCharacters();
    const PMOE_Dict = { ...weapons, ...characters };
    const fileData = await getFileData();
    const accounts = getAccounts(fileData);
    console.log("Acquired Data:\n", fileData, accounts, PMOE_Dict, "\n");
    const accountsUIGF = [];
    accounts.forEach((accountString) => {
        let account = new Account(accountString, fileData, PMOE_Dict);
        accountsUIGF.push(account);
        downloadData(account.UIGFRoot);
    });
    navigator.clipboard.writeText(JSON.stringify(accountsUIGF));
    console.log(accountsUIGF);
}

function downloadData(data) {
    const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(data));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", data.info.uid+".json");
    dlAnchorElem.click();
    dlAnchorElem.remove();
}

//APIs or such for conversion
const API = {
    characters:
        "https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/furnishing/en.json",
    weapons:
        "https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/weapons/en.json",
    uigf: "https://api.uigf.org/translate/",
};

//Functions to get the data to convert PMOE id -> name;
//1. Function to get the weapons' data from the raw data
async function getWeapons() {
    const fetchedPromise = await fetch(API.weapons);
    const data = await fetchedPromise.json();
    return data;
}

//2. Function to get the Characters' (Furnishing to be precise, because MadeBaruna didn't provide a characters API)
async function getCharacters() {
    const fetchedPromise = await fetch(API.characters);
    const data = await fetchedPromise.json();
    return data;
}

//Function to get the file from user
async function getFileData() {
    return new Promise((resolve, reject) => {
        const file = document.getElementById("file").files[0];
        if (!file) {
            alert("Please insert a file first!");
            reject("No file selected");
            return;
        }
        if (file.type !== "application/json") {
            alert("Wrong file type!");
            reject("Invalid file type");
            return;
        }
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            try {
                const result = JSON.parse(reader.result);
                resolve(result);
            } catch (error) {
                reject("Error parsing JSON data: " + error);
            }
        };
        reader.onerror = () => {
            reject("Error reading file");
        };
    });
}

//Function to get all the related accounts from PMOE as as array (i.e String concatenated infront of the main keys like uid, wish-counter, etc)
function getAccounts(fileData) {
    const accArray = Object.keys(fileData).filter((key) =>
        key.includes("wish-uid")
    );
    return accArray.map((accountUID) => {
        return accountUID.replace("wish-uid", "");
    });
}

//Classes required for an account
class UIGFRoot {
    constructor(uid, currentTime, allPulls) {
        this.info = new UIGFInfo(
            uid,
            "en-us",
            currentTime,
            "PMOE-Converter",
            "1.0.0",
            "v3.0"
        );
        this.list = this.getList(allPulls);
    }
    getList(allPulls) {
        let uigfPulls = [];
        let currentPullId = parseInt(String(this.info.uid) + "000000");
        allPulls.forEach((singlePull) => {
            let listItem = new UIGFListItem(
                singlePull,
                singlePull.gachaType,
                currentPullId++
            );
            uigfPulls.push(listItem);
        });
        return uigfPulls;
    }
}

class UIGFInfo {
    constructor(uid, lang, currentTime, appName, appVersion, uigfVersion) {
        this.uid = uid;
        this.lang = lang;
        this.export_timestamp = Math.floor(currentTime / 1000);
        this.export_app = appName;
        this.export_app_version = appVersion;
        this.uigf_version = uigfVersion;
    }
}

class UIGFListItem {
    constructor(pmoePull, gachaType, id, itemId) {
        this.uigf_gacha_type = gachaType == 400 ? 301 : gachaType;
        this.gacha_type = gachaType;
        this.count = pmoePull["pity"];
        this.time = pmoePull["time"];
        this.item_id = tempIds[pmoePull.itemName];
        this.id = id;
    }
}

class Account {
    constructor(accountName, fileData, PMOE_Dict) {
        this.accountName = accountName;
        this.UID = this.getUID(fileData);
        this.currentTime = new Date().getTime();
        this.allPulls = this.getPulls(fileData, PMOE_Dict);
        this.UIGFRoot = new UIGFRoot(this.UID, this.currentTime, this.allPulls);
    }
    getUID(fileData) {
        return fileData[this.accountName + "wish-uid"];
    }
    getName(PMOEId, PMOE_Dict) {
        if (PMOE_Dict[PMOEId] != undefined) return PMOE_Dict[PMOEId].name;
        return PMOEId[0].toUpperCase + PMOEId.slice(1);
    }
    getPulls(fileData, PMOE_Dict) {
        let allPulls = [];
        try {
            fileData[this.accountName + "wish-counter-beginners"].pulls.forEach(
                (beginnerPull) => {
                    let itemName = this.getName(beginnerPull.id, PMOE_Dict);
                    let pullObject = {
                        gachaType: 100,
                        itemName,
                        time: beginnerPull.time,
                        itemType: beginnerPull.type,
                        pity: beginnerPull.pity,
                    };
                    allPulls.push(pullObject);
                }
            );
        } catch (err) {
            if (err.name == "TypeError") {
                console.log("Couldn't find any beginners wishes");
            } else {
                console.log(err);
            }
        }
        try {
            fileData[
                this.accountName + "wish-counter-character-event"
            ].pulls.forEach((characterPull) => {
                let itemName = this.getName(characterPull.id, PMOE_Dict);
                let pullObject = {
                    gachaType: 301,
                    itemName,
                    time: characterPull.time,
                    itemType: characterPull.type,
                    pity: characterPull.pity,
                };
                allPulls.push(pullObject);
            });
        } catch (err) {
            if (err.name == "TypeError") {
                console.log("Couldn't find any character wishes");
                console.log(err);
            } else {
                console.log(err);
            }
        }
        try {
            fileData[this.accountName + "wish-counter-standard"].pulls.forEach(
                (standardPull) => {
                    let itemName = this.getName(standardPull.id, PMOE_Dict);
                    let pullObject = {
                        gachaType: 200,
                        itemName,
                        time: standardPull.time,
                        itemType: standardPull.type,
                        pity: standardPull.pity,
                    };
                    allPulls.push(pullObject);
                }
            );
        } catch (err) {
            if (err.name == "TypeError") {
                console.log("Couldn't find any standard wishes");
                console.log(err);
            } else {
                console.log(err);
            }
        }
        try {
            fileData[
                this.accountName + "wish-counter-weapon-event"
            ].pulls.forEach((weaponPull) => {
                let itemName = this.getName(weaponPull.id, PMOE_Dict);
                let pullObject = {
                    gachaType: 302,
                    itemName,
                    time: weaponPull.time,
                    itemType: weaponPull.type,
                    pity: weaponPull.pity,
                };
                allPulls.push(pullObject);
            });
        } catch (err) {
            if (err.name == "TypeError") {
                console.log("Couldn't find any weapon wishes");
            } else {
                console.log(err);
            }
        }
        try {
            fileData[
                this.accountName + "wish-counter-chronicled"
            ].pulls.forEach((chronicledPull) => {
                let itemName = this.getName(chronicledPull.id, PMOE_Dict);
                let pullObject = {
                    gachaType: 500,
                    itemName,
                    time: chronicledPull.time,
                    itemType: chronicledPull.type,
                    pity: chronicledPull.pity,
                };
                allPulls.push(pullObject);
            });
        } catch (err) {
            if (err.name == "TypeError") {
                console.log(
                    "Couldn't find any chronicled wishes, for UID: " + this.UID
                );
            } else {
                console.log(err);
            }
        }
        return allPulls;
    }
}

const tempIds = {
    "Dull Blade": 11101,
    "Silver Sword": 11201,
    "Cool Steel": 11301,
    "Harbinger of Dawn": 11302,
    "Traveler's Handy Sword": 11303,
    "Dark Iron Sword": 11304,
    "Fillet Blade": 11305,
    "Skyrider Sword": 11306,
    "Favonius Sword": 11401,
    "The Flute": 11402,
    "Sacrificial Sword": 11403,
    "Royal Longsword": 11404,
    "Lion's Roar": 11405,
    "Prototype Rancour": 11406,
    "Iron Sting": 11407,
    "Blackcliff Longsword": 11408,
    "The Black Sword": 11409,
    "The Alley Flash": 11410,
    "Sword of Descension": 11412,
    "Festering Desire": 11413,
    "Amenoma Kageuchi": 11414,
    "Cinnabar Spindle": 11415,
    "Kagotsurube Isshin": 11416,
    "Sapwood Blade": 11417,
    "Xiphos' Moonlight": 11418,
    "Prized Isshin Blade": 11421,
    "Toukabou Shigure": 11422,
    "Wolf-Fang": 11424,
    "Finale of the Deep": 11425,
    "Fleuve Cendre Ferryman": 11426,
    "The Dockhand's Assistant": 11427,
    "Sword of Narzissenkreuz": 11429,
    "Aquila Favonia": 11501,
    "Skyward Blade": 11502,
    "Freedom-Sworn": 11503,
    "Summit Shaper": 11504,
    "Primordial Jade Cutter": 11505,
    "One Side": 11507,
    "Mistsplitter Reforged": 11509,
    "Haran Geppaku Futsu": 11510,
    "Key of Khaj-Nisut": 11511,
    "Light of Foliar Incision": 11512,
    "Splendor of Tranquil Waters": 11513,
    "Uraku Misugiri": 11514,
    "Waster Greatsword": 12101,
    "Old Merc's Pal": 12201,
    "Ferrous Shadow": 12301,
    "Bloodtainted Greatsword": 12302,
    "White Iron Greatsword": 12303,
    Quartz: 12304,
    "Debate Club": 12305,
    "Skyrider Greatsword": 12306,
    "Favonius Greatsword": 12401,
    "The Bell": 12402,
    "Sacrificial Greatsword": 12403,
    "Royal Greatsword": 12404,
    Rainslasher: 12405,
    "Prototype Archaic": 12406,
    Whiteblind: 12407,
    "Blackcliff Slasher": 12408,
    "Serpent Spine": 12409,
    "Lithic Blade": 12410,
    "Snow-Tombed Starsilver": 12411,
    "Luxurious Sea-Lord": 12412,
    "Katsuragikiri Nagamasa": 12414,
    "Makhaira Aquamarine": 12415,
    Akuoumaru: 12416,
    "Forest Regalia": 12417,
    "Mailed Flower": 12418,
    "Talking Stick": 12424,
    "Tidal Shadow": 12425,
    '"Ultimate Overlord\'s Mega Magic Sword"': 12426,
    "Portable Power Saw": 12427,
    "Skyward Pride": 12501,
    "Wolf's Gravestone": 12502,
    "Song of Broken Pines": 12503,
    "The Unforged": 12504,
    "Primordial Jade Greatsword": 12505,
    "The Other Side": 12506,
    "Redhorn Stonethresher": 12510,
    "Beacon of the Reed Sea": 12511,
    Verdict: 12512,
    "Beginner's Protector": 13101,
    "Iron Point": 13201,
    "White Tassel": 13301,
    Halberd: 13302,
    "Black Tassel": 13303,
    "The Flagstaff": 13304,
    "Dragon's Bane": 13401,
    "Prototype Starglitter": 13402,
    "Crescent Pike": 13403,
    "Blackcliff Pole": 13404,
    Deathmatch: 13405,
    "Lithic Spear": 13406,
    "Favonius Lance": 13407,
    "Royal Spear": 13408,
    "Dragonspine Spear": 13409,
    "Kitain Cross Spear": 13414,
    '"The Catch"': 13415,
    "Wavebreaker's Fin": 13416,
    Moonpiercer: 13417,
    "Missive Windspear": 13419,
    "Ballad of the Fjords": 13424,
    "Rightful Reward": 13425,
    "Dialogues of the Desert Sages": 13426,
    "Prospector's Drill": 13427,
    "Staff of Homa": 13501,
    "Skyward Spine": 13502,
    "Vortex Vanquisher": 13504,
    "Primordial Jade Winged-Spear": 13505,
    Deicide: 13506,
    "Calamity Queller": 13507,
    "Engulfing Lightning": 13509,
    "Staff of the Scarlet Sands": 13511,
    "Apprentice's Notes": 14101,
    "Pocket Grimoire": 14201,
    "Magic Guide": 14301,
    "Thrilling Tales of Dragon Slayers": 14302,
    "Otherworldly Story": 14303,
    "Emerald Orb": 14304,
    "Twin Nephrite": 14305,
    "Amber Bead": 14306,
    "Favonius Codex": 14401,
    "The Widsith": 14402,
    "Sacrificial Fragments": 14403,
    "Royal Grimoire": 14404,
    "Solar Pearl": 14405,
    "Prototype Amber": 14406,
    "Mappa Mare": 14407,
    "Blackcliff Agate": 14408,
    "Eye of Perception": 14409,
    "Wine and Song": 14410,
    Frostbearer: 14412,
    "Dodoco Tales": 14413,
    "Hakushin Ring": 14414,
    "Oathsworn Eye": 14415,
    "Wandering Evenstar": 14416,
    "Fruit of Fulfillment": 14417,
    "Sacrificial Jade": 14424,
    "Flowing Purity": 14425,
    "Ballad of the Boundless Blue": 14426,
    "Skyward Atlas": 14501,
    "Lost Prayer to the Sacred Winds": 14502,
    "Lost Ballade": 14503,
    "Memory of Dust": 14504,
    "Jadefall's Splendor": 14505,
    "Everlasting Moonglow": 14506,
    "Kagura's Verity": 14509,
    "A Thousand Floating Dreams": 14511,
    "Tulaytullah's Remembrance": 14512,
    "Cashflow Supervision": 14513,
    "Tome of the Eternal Flow": 14514,
    "Crane's Echoing Call": 14515,
    "Hunter's Bow": 15101,
    "Seasoned Hunter's Bow": 15201,
    "Raven Bow": 15301,
    "Sharpshooter's Oath": 15302,
    "Recurve Bow": 15303,
    Slingshot: 15304,
    Messenger: 15305,
    "Ebony Bow": 15306,
    "Favonius Warbow": 15401,
    "The Stringless": 15402,
    "Sacrificial Bow": 15403,
    "Royal Bow": 15404,
    Rust: 15405,
    "Prototype Crescent": 15406,
    "Compound Bow": 15407,
    "Blackcliff Warbow": 15408,
    "The Viridescent Hunt": 15409,
    "Alley Hunter": 15410,
    "Fading Twilight": 15411,
    "Mitternachts Waltz": 15412,
    "Windblume Ode": 15413,
    Hamayumi: 15414,
    Predator: 15415,
    "Mouun's Moon": 15416,
    "King's Squire": 15417,
    "End of the Line": 15418,
    "Ibis Piercer": 15419,
    "Scion of the Blazing Sun": 15424,
    "Song of Stillness": 15425,
    "Range Gauge": 15427,
    "Skyward Harp": 15501,
    "Amos' Bow": 15502,
    "Elegy for the End": 15503,
    "Kunwu's Wyrmbane": 15504,
    "Primordial Jade Vista": 15505,
    "Mirror Breaker": 15506,
    "Polar Star": 15507,
    "Aqua Simulacra": 15508,
    "Thundering Pulse": 15509,
    "Hunter's Path": 15511,
    "The First Great Magic": 15512,
    "Kamisato Ayaka": 10000002,
    Jean: 10000003,
    Traveler: 10000007,
    Lisa: 10000006,
    Barbara: 10000014,
    Kaeya: 10000015,
    Diluc: 10000016,
    Razor: 10000020,
    Amber: 10000021,
    Venti: 10000022,
    Xiangling: 10000023,
    Beidou: 10000024,
    Xingqiu: 10000025,
    Xiao: 10000026,
    Ningguang: 10000027,
    Klee: 10000029,
    Zhongli: 10000030,
    Fischl: 10000031,
    Bennett: 10000032,
    Tartaglia: 10000033,
    Noelle: 10000034,
    Qiqi: 10000035,
    Chongyun: 10000036,
    Ganyu: 10000037,
    Albedo: 10000038,
    Diona: 10000039,
    Mona: 10000041,
    Keqing: 10000042,
    Sucrose: 10000043,
    Xinyan: 10000044,
    Rosaria: 10000045,
    "Hu Tao": 10000046,
    "Kaedehara Kazuha": 10000047,
    Yanfei: 10000048,
    Yoimiya: 10000049,
    Thoma: 10000050,
    Eula: 10000051,
    "Raiden Shogun": 10000052,
    Sayu: 10000053,
    "Sangonomiya Kokomi": 10000054,
    Gorou: 10000055,
    "Kujou Sara": 10000056,
    "Arataki Itto": 10000057,
    "Yae Miko": 10000058,
    "Shikanoin Heizou": 10000059,
    Yelan: 10000060,
    Kirara: 10000061,
    Aloy: 10000062,
    Shenhe: 10000063,
    "Yun Jin": 10000064,
    "Kuki Shinobu": 10000065,
    "Kamisato Ayato": 10000066,
    Collei: 10000067,
    Dori: 10000068,
    Tighnari: 10000069,
    Nilou: 10000070,
    Cyno: 10000071,
    Candace: 10000072,
    Nahida: 10000073,
    Layla: 10000074,
    Wanderer: 10000075,
    Faruzan: 10000076,
    Yaoyao: 10000077,
    Alhaitham: 10000078,
    Dehya: 10000079,
    Mika: 10000080,
    Kaveh: 10000081,
    Baizhu: 10000082,
    Lynette: 10000083,
    Lyney: 10000084,
    Freminet: 10000085,
    Wriothesley: 10000086,
    Neuvillette: 10000087,
    Charlotte: 10000088,
    Furina: 10000089,
    Chevreuse: 10000090,
    Navia: 10000091,
    Gaming: 10000092,
    Xianyun: 10000093,
    Chiori: 10000094,
};
