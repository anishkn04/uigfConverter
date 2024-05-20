function changeInputStyle(element) {
    const addedFilesDiv = document.getElementById("addedFiles");
    const files = element.files;
    const numOfFiles = files.length;
    let fileNames = "";
    for (let index = 0; index < numOfFiles; index++) {
        fileNames += `<span> ${files[index].name} </span>`;
    }
    addedFilesDiv.innerHTML = fileNames;
    addedFilesDiv.style.display = "flex";
}

async function convertFiles() {
    const files = document.getElementById("file").files;
    const numOfFiles = files.length;
    if (numOfFiles == 0) {
        alert("Insert some file first!");
        return;
    }
    for (let index = 0; index < numOfFiles; index++) {
        await convert(index);
        console.log("Converted " + files[index].name);
    }
}

//APIs or such for conversion
const API = {
    characters:
        "https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/furnishing/en.json",
    weapons:
        "https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/weapons/en.json",
    uigf: "https://api.uigf.org/dict/genshin/en.json",
};

const getIdsFromApi = async () => {
    const response = await fetch(API.uigf);
    console.log("Success!")
    return (await response.json());
}


//I will refer to "paimon.moe" as "PMOE" for the sake of convenience

async function convert(index) {
    const weapons = await getWeapons();
    const characters = await getCharacters();
    const PMOE_Dict = { ...weapons, ...characters };
    const fileData = await getFileData(index);
    const accounts = getAccounts(fileData);
    const idsFromApi = await getIdsFromApi();
    console.log("Acquired Data:\n", fileData, accounts, PMOE_Dict, "\n");
    const accountsUIGF = [];
    accounts.forEach((accountString) => {
        let account = new Account(accountString, fileData, PMOE_Dict, idsFromApi);
        accountsUIGF.push(account);
        let confirmDownload = confirm(`The data for UID ${account.UID} has been processed. Click Ok to download the file or Cancel to leave it!`);
        if(confirmDownload){
            downloadData(account.UIGFRoot);
        }
    });
    console.log(accountsUIGF);
}

function downloadData(data) {
    const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(data));
    const dlAnchorElem = document.createElement("a");
    const monthsExcluded = document.querySelector(
        ".removeDuplicateRadio:checked"
    ).value;
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute(
        "download",
        data.info.uid + `(excluding_${monthsExcluded}_months)` + ".json"
    );
    dlAnchorElem.click();
    dlAnchorElem.remove();
}


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
async function getFileData(index) {
    return new Promise((resolve, reject) => {
        const file = document.getElementById("file").files[index];
        if (!file) {
            alert("Please insert a file first!");
            reject("No file selected");
            return;
        }
        if (file.type !== "application/json") {
            alert("Wrong file type! (.json Expected)");
            reject("Invalid file type");
            return;
        }
        if (!file.name.includes("paimon-moe-local-data")) {
            alert("Provide correct file or do not rename the exported file!");
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
    constructor(uid, currentDate, allPulls, idsFromApi) {
        this.info = new UIGFInfo(
            uid,
            "en-us",
            currentDate,
            "PMOE-Converter",
            "1.0.0",
            "v3.0"
        );
        this.list = this.getList(allPulls, currentDate, idsFromApi);
    }
    getList(allPulls, currentDate, idsFromApi) {
        let uigfPulls = [];
        let currentPullId = parseInt(String(this.info.uid) + "000000");
        const removeDuplicateMonth = parseInt(
            document.querySelector(".removeDuplicateRadio:checked").value
        );
        const filteredPulls = allPulls.map((singlePull) => {
            const pullTime = new Date(singlePull.time);
            let timeToRemoveInMs;
            if (removeDuplicateMonth == 6) {
                timeToRemoveInMs = 15552000000;
            } else if (removeDuplicateMonth == 12) {
                timeToRemoveInMs = 31536000000;
            } else {
                timeToRemoveInMs = 0;
            }
            if (currentDate.getTime() - pullTime.getTime() > timeToRemoveInMs) {
                return singlePull;
            }
        });
        filteredPulls.forEach((singlePull) => {
            if (singlePull != undefined) {
                let listItem = new UIGFListItem(
                    singlePull,
                    singlePull.gachaType.toString(),
                    (currentPullId++).toString(),
                    idsFromApi
                );
                uigfPulls.push(listItem);
            }
        });
        return uigfPulls;
    }
    convertToList() { }
}

class UIGFInfo {
    constructor(uid, lang, currentDate, appName, appVersion, uigfVersion) {
        this.uid = uid;
        this.lang = lang;
        this.export_timestamp = Math.floor(currentDate.getTime() / 1000);
        this.export_time = this.getTimeInFormat(currentDate);
        this.export_app = appName;
        this.region_time_zone = this.getRegionTimeZone(this.uid[0]);
        this.export_app_version = appVersion;
        this.uigf_version = uigfVersion;
    }
    getTimeInFormat(currentDate) {
        const date = currentDate.toISOString().split("T")[0];
        const time = currentDate.toTimeString().split(" ")[0];
        return date + " " + time;
    }
    getRegionTimeZone(firstUIDCharacter) {
        switch (firstUIDCharacter) {
            case "6":
                return -5;
            case "7":
                return 1;
            default:
                return 8;
        }
    }
}

class UIGFListItem {
    constructor(pmoePull, gachaType, id, idsFromApi) {
        this.uigf_gacha_type = gachaType == 400 ? 301 : gachaType;
        this.gacha_type = gachaType;
        this.count = "1";
        this.time = pmoePull["time"];
        this.item_id = this.idInString(pmoePull, idsFromApi);
        this.id = id;
    }
    idInString(pmoePull, idsFromApi) {
        console.log(idsFromApi);
        const id = idsFromApi[pmoePull.itemName];
        // console.log(String(id))
        return String(id);
    }
}

class Account {
    constructor(accountName, fileData, PMOE_Dict, idsFromApi) {
        this.accountName = accountName;
        this.UID = this.getUID(fileData);
        this.currentDate = new Date();
        this.allPulls = this.getPulls(fileData, PMOE_Dict);
        this.UIGFRoot = new UIGFRoot(this.UID, this.currentDate, this.allPulls, idsFromApi);
    }
    getUID(fileData) {
        return fileData[this.accountName + "wish-uid"].toString();
    }
    getName(PMOEId, PMOE_Dict) {
        if (PMOE_Dict[PMOEId] != undefined) return PMOE_Dict[PMOEId].name;
        return PMOEId[0].toUpperCase() + PMOEId.slice(1);
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