//I will refer to "paimon.moe" as "PMOE" for the sake of convenience

async function convert() {
    const weapons = await getWeapons();
    const characters = await getCharacters();
    const ID_Dict = {...weapons, ...characters}
    const fileData = await getFileData();
    const accounts = getAccounts(fileData);
    console.log(
        "Acquired Data:\n",
        fileData,
        accounts,
        ID_Dict,
        "\n"
    );
    const accountsUIGF = accounts.map(
        (accountString) => new Account(accountString, fileData, ID_Dict)
    );
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
    constructor(info, list) {
        this.info = info;
        this.list = list;
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
    constructor(pmoePull, gachaType, id, ID_Dict) {
        this.uigf_gacha_type = (gachaType == 400 ? 301 : gachaType);
        this.gacha_type = gachaType;
        this.count = pmoePull["pity"];
        this.time = pmoePull["time"];
        this.item_id = getId();
        this.id = id;
    }
}

class Account {
    constructor(accountName, fileData, ID_Dict) {
        this.accountName = accountName;
        this.UID = this.getUID(fileData);
        this.currentTime = new Date().getTime();
        this.allPulls = this.getPulls(fileData, ID_Dict);
        this.UIGFRoot = uigfRoot;
    }
    getUID(fileData) {
        return fileData[this.accountName + "wish-uid"];
    }
    getPulls(fileData, ID_Dict) {
        let allPulls = new Array();
        let currentPullId = parseInt(String(this.UID) + "000000");
        fileData[this.accountName + "wish-counter-beginners"]["pulls"].forEach(
            (beginnerPull) => {
                pullObject = new Object(
                    beginnerPull,
                    100,
                    this.currentPullId++,
                    ID_Dict[beginnerPull.id]["name"]
                    //gets name from the paimon moe
                    //convert this to id and create UIGF    
                );
                this.allPulls.push(pullObject);
            }
        );
    }
}
