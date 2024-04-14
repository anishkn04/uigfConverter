//I will refer to "paimon.moe" as "PMOE" for the sake of convenience

async function convert() {
    const weapons = await getWeapons();
    const characters = await getCharacters();
    const fileData = await getFileData();
    const accounts = getAccounts(fileData);
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


class Account{
    accountName;
    UID;
    currentTime;
    allPulls = new Object();
    UIGF = new Object();
}