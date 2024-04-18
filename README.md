# uigfConverter
Script to convert paimon.moe wish data to UIGF format

Paimon.moe assigns id to characters or weapons in it's own way.
And there is no API to convert that into their actual name or in game id.
To convert these ids, I used following source (Paimon.mow - Github) :
-> `https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/weapons/en.json`
-> `https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/furnishing/en.json`
_(There is no dictionary provided for the characters, thus I had to use the furnishings for now)_

# Problems
The 'furnishings' dictionary itself doesn't have the data for all characters like Kaveh, Yaoyaom etc. (Newer Characters). So, just capitalized their first letter to use as name which works for the current list of characters. But, if a new character is realeased with multiple names (for eg. Kamisato Ayaka) or if a character as any other difference than simply name->Name (i.e kaveh -> Kaveh) then the converter wouldn't be able to convert that character's name to ingame id which may cause failure.

Simple error and the data are printed to the console too!