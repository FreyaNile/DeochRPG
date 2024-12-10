 // Load
function getStoredValues() {
    // Set player level
    document.getElementById("characterName").value = localStorage.getItem("characterName");
    document.getElementById("playerLevel").value = localStorage.getItem("playerLevel");
    document.getElementById("heritage").value = localStorage.getItem("heritage");
    document.getElementById("charclass").value = localStorage.getItem("charclass");
    document.getElementById("charrank").value = localStorage.getItem("charrank");
    document.getElementById("armour").value = localStorage.getItem("armour");
    document.getElementById("spells").value = localStorage.getItem("spells");
    document.getElementById("experience").value = localStorage.getItem("experience");
    updateProfBonus();
    
    // Set ability scores
    document.getElementById("strScore").value = localStorage.getItem("strScore");
    document.getElementById("dexScore").value = localStorage.getItem("dexScore");
    document.getElementById("conScore").value = localStorage.getItem("conScore");
    document.getElementById("intScore").value = localStorage.getItem("intScore");
    document.getElementById("wisScore").value = localStorage.getItem("wisScore");
    document.getElementById("chaScore").value = localStorage.getItem("chaScore");
    updateModifiers();
   

    // Set armor + shield
    document.getElementById("equippedShield").value = localStorage.getItem("equippedShield");
    
    // Set HP/hit dice
    document.getElementById("currentHP").value = localStorage.getItem("currentHP");
    document.getElementById("currenttempHP").value = localStorage.getItem("currenttempHP");
    document.getElementById("maxHP").value = localStorage.getItem("maxHP");
    document.getElementById("hitDice").value = localStorage.getItem("hitDice");
    document.getElementById("hitDie").value = localStorage.getItem("hitDie");
    document.getElementById("dmgRed").value = localStorage.getItem("dmgRed");
    document.getElementById("currentMana").value = localStorage.getItem("currentMana");
    document.getElementById("maxMana").value = localStorage.getItem("maxMana");
    document.getElementById("statPoints").value = localStorage.getItem("statPoints");
    // Set skills 
    document.getElementById("acroProf").checked = JSON.parse(localStorage.getItem('acroProf'));
    document.getElementById("animProf").checked = JSON.parse(localStorage.getItem('animProf'));
    document.getElementById("arcaProf").checked = JSON.parse(localStorage.getItem('arcaProf'));
    document.getElementById("athlProf").checked = JSON.parse(localStorage.getItem('athlProf'));
    document.getElementById("decProf").checked =  JSON.parse(localStorage.getItem('decProf'));
    document.getElementById("hisProf").checked =  JSON.parse(localStorage.getItem('hisProf'));
    document.getElementById("insProf").checked = JSON.parse(localStorage.getItem('insProf'));
    document.getElementById("intiProf").checked = JSON.parse(localStorage.getItem('intiProf'));
    document.getElementById("invProf").checked = JSON.parse(localStorage.getItem('invProf'));
    document.getElementById("medProf").checked = JSON.parse(localStorage.getItem('medProf'));
    document.getElementById("natProf").checked = JSON.parse(localStorage.getItem('natProf'));
    document.getElementById("sleiProf").checked = JSON.parse(localStorage.getItem('sleiProf')); 
    document.getElementById("arcLang").checked = JSON.parse(localStorage.getItem('arcLang'));
    document.getElementById("arcLang2").checked = JSON.parse(localStorage.getItem('arcLang2'));
    document.getElementById("draLang").checked = JSON.parse(localStorage.getItem('draLang'));
    document.getElementById("draLang2").checked = JSON.parse(localStorage.getItem('draLang2'));
    document.getElementById("dweLang").checked = JSON.parse(localStorage.getItem('dweLang'));
    document.getElementById("dweLang2").checked = JSON.parse(localStorage.getItem('dweLang2'));
    document.getElementById("gishLang").checked = JSON.parse(localStorage.getItem('gishLang'));
    document.getElementById("gishLang2").checked = JSON.parse(localStorage.getItem('gishLang2'));
    document.getElementById("neweLang").checked = JSON.parse(localStorage.getItem('neweLang'));
    document.getElementById("neweLang2").checked = JSON.parse(localStorage.getItem('neweLang2'));
    document.getElementById("oldeLang").checked = JSON.parse(localStorage.getItem('oldeLang'));
    document.getElementById("oldeLang2").checked = JSON.parse(localStorage.getItem('oldeLang2'));
    document.getElementById("orenLang").checked = JSON.parse(localStorage.getItem('orenLang'));
    document.getElementById("orenLang2").checked = JSON.parse(localStorage.getItem('orenLang2'));
    document.getElementById("runicLang").checked = JSON.parse(localStorage.getItem('runicLang'));
    document.getElementById("runicLang2").checked = JSON.parse(localStorage.getItem('runicLang2'));
    document.getElementById("cantLang").checked = JSON.parse(localStorage.getItem('cantLang'));
    document.getElementById("cantLang2").checked = JSON.parse(localStorage.getItem('cantLang2'));
    document.getElementById("alchemisttools").checked = JSON.parse(localStorage.getItem('alchemisttools'));
    document.getElementById("alchemisttools2").checked = JSON.parse(localStorage.getItem('alchemisttools2'));
    document.getElementById("artisantools").checked = JSON.parse(localStorage.getItem('artisantools'));
    document.getElementById("artisantools2").checked = JSON.parse(localStorage.getItem('artisantools2'));
    document.getElementById("cheftools").checked = JSON.parse(localStorage.getItem('cheftools'));
    document.getElementById("cheftools2").checked = JSON.parse(localStorage.getItem('cheftools2'));
    document.getElementById("herbalisttools").checked = JSON.parse(localStorage.getItem('herbalisttools'));
    document.getElementById("herbalisttools2").checked = JSON.parse(localStorage.getItem('herbalisttools2'));
    document.getElementById("thieftools").checked = JSON.parse(localStorage.getItem('thieftools'));
    document.getElementById("thieftools2").checked = JSON.parse(localStorage.getItem('thieftools2'));
    document.getElementById("armorClass").value = localStorage.getItem("armorClass");
    setSkills();

    // Set recipes
    document.getElementById("acidcheck").checked = JSON.parse(localStorage.getItem('acidcheck'));
    document.getElementById("alchemistfirecheck").checked = JSON.parse(localStorage.getItem('alchemistfirecheck'));
    document.getElementById("invispotioncheck").checked = JSON.parse(localStorage.getItem('invispotioncheck'));
    document.getElementById("polypotioncheck").checked = JSON.parse(localStorage.getItem('polypotioncheck')); 
    document.getElementById("naturaldcheck").checked = JSON.parse(localStorage.getItem('naturaldcheck'));
    document.getElementById("talosdcheck").checked = JSON.parse(localStorage.getItem('talosdcheck'));
    document.getElementById("locketdcheck").checked = JSON.parse(localStorage.getItem('locketdcheck'));
    document.getElementById("antibrewcheck").checked = JSON.parse(localStorage.getItem('antibrewcheck'));
    document.getElementById("aphrodisiaccheck").checked = JSON.parse(localStorage.getItem('aphrodisiaccheck'));
    document.getElementById("bottledrestcheck").checked = JSON.parse(localStorage.getItem('bottledrestcheck'));
    document.getElementById("ambrosiacheck").checked = JSON.parse(localStorage.getItem('ambrosiacheck'));
    document.getElementById("brewvitalitycheck").checked = JSON.parse(localStorage.getItem('brewvitalitycheck'));
    document.getElementById("dwellenbrewcheck").checked = JSON.parse(localStorage.getItem('dwellenbrewcheck'));
    document.getElementById("lightbottlecheck").checked = JSON.parse(localStorage.getItem('lightbottlecheck'));
    document.getElementById("antitoxincheck").checked = JSON.parse(localStorage.getItem('antitoxincheck'));
    document.getElementById("invelixircheck").checked = JSON.parse(localStorage.getItem('invelixircheck'));
    document.getElementById("healingelixircheck").checked = JSON.parse(localStorage.getItem('healingelixircheck'));
    document.getElementById("panaceacheck").checked = JSON.parse(localStorage.getItem('panaceacheck'));
    document.getElementById("truthelixircheck").checked = JSON.parse(localStorage.getItem('truthelixircheck'));
    document.getElementById("basicpoisoncheck").checked = JSON.parse(localStorage.getItem('basicpoisoncheck'));
    document.getElementById("dwellerdustcheck").checked = JSON.parse(localStorage.getItem('dwellerdustcheck'));
    document.getElementById("ichariivenomcheck").checked = JSON.parse(localStorage.getItem('ichariivenomcheck'));
    document.getElementById("malevolencecheck").checked = JSON.parse(localStorage.getItem('malevolencecheck'));
  
  }
   // Save
  function setLocalStorage() {
    // Save player level
    localStorage.setItem("characterName", document.getElementById("characterName").value);
    localStorage.setItem("playerLevel", document.getElementById("playerLevel").value);
    localStorage.setItem("heritage", document.getElementById("heritage").value);
    localStorage.setItem("charclass", document.getElementById("charclass").value);
    localStorage.setItem("charrank", document.getElementById("charrank").value);
    localStorage.setItem("armour", document.getElementById("armour").value);
    localStorage.setItem("spells", document.getElementById("spells").value);
    localStorage.setItem("experience", document.getElementById("experience").value);
    
    // Save ability scores
    localStorage.setItem("strScore", document.getElementById("strScore").value);
    localStorage.setItem("dexScore", document.getElementById("dexScore").value);
    localStorage.setItem("conScore", document.getElementById("conScore").value);
    localStorage.setItem("intScore", document.getElementById("intScore").value);
    localStorage.setItem("wisScore", document.getElementById("wisScore").value);
    localStorage.setItem("chaScore", document.getElementById("chaScore").value);
    
    // Save armor + shield
    localStorage.setItem("equippedShield", document.getElementById("equippedShield").value);
  
    // Save HP/hit dice
    localStorage.setItem("currentHP", document.getElementById("currentHP").value);
    localStorage.setItem("currenttempHP", document.getElementById("currenttempHP").value);
    localStorage.setItem("maxHP", document.getElementById("maxHP").value);
    localStorage.setItem("hitDice", document.getElementById("hitDice").value);
    localStorage.setItem("hitDie", document.getElementById("hitDie").value);
    localStorage.setItem("dmgRed", document.getElementById("dmgRed").value);
     localStorage.setItem("currentMana", document.getElementById("currentMana").value);
     localStorage.setItem("maxMana", document.getElementById("maxMana").value);
    localStorage.setItem("statPoints", document.getElementById("statPoints").value);
    // Save skills
    localStorage.setItem('acroProf', document.getElementById('acroProf').checked);
    localStorage.setItem('animProf', document.getElementById('animProf').checked);
    localStorage.setItem('arcaProf', document.getElementById('arcaProf').checked);
    localStorage.setItem('athlProf', document.getElementById('athlProf').checked);
    localStorage.setItem('decProf', document.getElementById('decProf').checked);
    localStorage.setItem('hisProf', document.getElementById('hisProf').checked);
    localStorage.setItem('insProf', document.getElementById('insProf').checked);
    localStorage.setItem('intiProf', document.getElementById('intiProf').checked);
    localStorage.setItem('invProf', document.getElementById('invProf').checked);
    localStorage.setItem('medProf', document.getElementById('medProf').checked);
    localStorage.setItem('natProf', document.getElementById('natProf').checked);
    var checkbox = document.getElementById('sleiProf');
    localStorage.setItem('sleiProf', checkbox.checked);
    localStorage.setItem('arcLang', document.getElementById('arcLang').checked);
    localStorage.setItem('arcLang2', document.getElementById('arcLang2').checked);
    localStorage.setItem('draLang', document.getElementById('draLang').checked);
    localStorage.setItem('draLang2', document.getElementById('draLang2').checked);
    localStorage.setItem('dweLang', document.getElementById('dweLang').checked);
    localStorage.setItem('dweLang2', document.getElementById('dweLang2').checked);
    localStorage.setItem('gishLang', document.getElementById('gishLang').checked);
    localStorage.setItem('gishLang2', document.getElementById('gishLang2').checked);
    localStorage.setItem('neweLang', document.getElementById('neweLang').checked);
    localStorage.setItem('neweLang2', document.getElementById('neweLang2').checked);
    localStorage.setItem('oldeLang', document.getElementById('oldeLang').checked);
    localStorage.setItem('oldeLang2', document.getElementById('oldeLang2').checked);
    localStorage.setItem('orenLang', document.getElementById('orenLang').checked);
    localStorage.setItem('orenLang2', document.getElementById('orenLang2').checked);
    localStorage.setItem('runicLang', document.getElementById('runicLang').checked);
    localStorage.setItem('runicLang2', document.getElementById('runicLang2').checked);
    localStorage.setItem('cantLang', document.getElementById('cantLang').checked);
    localStorage.setItem('cantLang2', document.getElementById('cantLang2').checked);
    localStorage.setItem('alchemisttools', document.getElementById('alchemisttools').checked);
    localStorage.setItem('alchemisttools2', document.getElementById('alchemisttools2').checked);
    localStorage.setItem('artisantools', document.getElementById('artisantools').checked);
    localStorage.setItem('artisantools2', document.getElementById('artisantools2').checked);
    localStorage.setItem('cheftools', document.getElementById('cheftools').checked);
    localStorage.setItem('cheftools2', document.getElementById('cheftools2').checked);
    localStorage.setItem('herbalisttools', document.getElementById('herbalisttools').checked);
    localStorage.setItem('herbalisttools2', document.getElementById('herbalisttools2').checked);
    localStorage.setItem('thieftools', document.getElementById('thieftools').checked);
    localStorage.setItem('thieftools2', document.getElementById('thieftools2').checked);
    localStorage.setItem("armorClass", document.getElementById("armorClass").value);
   
    // Save recipes
    localStorage.setItem('acidcheck', document.getElementById('acidcheck').checked);
    localStorage.setItem('alchemistfirecheck', document.getElementById('alchemistfirecheck').checked);
    localStorage.setItem('invispotioncheck', document.getElementById('invispotioncheck').checked);
    localStorage.setItem('polypotioncheck', document.getElementById('polypotioncheck').checked);
    localStorage.setItem('naturaldcheck', document.getElementById('naturaldcheck').checked);
    localStorage.setItem('talosdcheck', document.getElementById('talosdcheck').checked);
    localStorage.setItem('locketdcheck', document.getElementById('locketdcheck').checked);
    localStorage.setItem('antibrewcheck', document.getElementById('antibrewcheck').checked);
    localStorage.setItem('ambrosiacheck', document.getElementById('ambrosiacheck').checked);
    localStorage.setItem('aphrodisiaccheck', document.getElementById('aphrodisiaccheck').checked);
    localStorage.setItem('bottledrestcheck', document.getElementById('bottledrestcheck').checked);
    localStorage.setItem('brewvitalitycheck', document.getElementById('brewvitalitycheck').checked);
    localStorage.setItem('dwellenbrewcheck', document.getElementById('dwellenbrewcheck').checked);
    localStorage.setItem('lightbottlecheck', document.getElementById('lightbottlecheck').checked);
    localStorage.setItem('antitoxincheck', document.getElementById('antitoxincheck').checked);
    localStorage.setItem('healingelixircheck', document.getElementById('healingelixircheck').checked);
    localStorage.setItem('invelixircheck', document.getElementById('invelixircheck').checked);
    localStorage.setItem('panaceacheck', document.getElementById('panaceacheck').checked);
    localStorage.setItem('truthelixircheck', document.getElementById('truthelixircheck').checked);
    localStorage.setItem('basicpoisoncheck', document.getElementById('basicpoisoncheck').checked);
    localStorage.setItem('dwellerdustcheck', document.getElementById('dwellerdustcheck').checked);
    localStorage.setItem('ichariivenomcheck', document.getElementById('ichariivenomcheck').checked);
    localStorage.setItem('malevolencecheck', document.getElementById('malevolencecheck').checked);





    // debug log
    var i;
      console.log("local storage");
      for (i = 0; i < localStorage.length; i++)   {
      console.log(localStorage.key(i) + "=[" + localStorage.getItem(localStorage.key(i)) + "]");
  }
    
  }
  
  function updateModifiers() {
    // convert ability scores into modifiers
    
    var strScore = document.getElementById("strScore").value;
    document.getElementById("strMod").value = Math.floor((strScore - 10)/2);
    var dexScore = document.getElementById("dexScore").value;
    document.getElementById("dexMod").value = Math.floor((dexScore - 10)/2);
    var conScore = document.getElementById("conScore").value;
    document.getElementById("conMod").value = Math.floor((conScore - 10)/2);
    var intScore = document.getElementById("intScore").value;
    document.getElementById("intMod").value = Math.floor((intScore - 10)/2);
    var wisScore = document.getElementById("wisScore").value;
    document.getElementById("wisMod").value = Math.floor((wisScore - 10)/2);
    var chaScore = document.getElementById("chaScore").value;
    document.getElementById("chaMod").value = Math.floor((chaScore - 10)/2);
    
    setSkills();
  
    shieldEquip(shieldEquip);
  }
  
  function updateProfBonus() {
    // update proficiency bonus based on player level
    
    var playerLevel = parseInt(document.getElementById("playerLevel").value);
    
    if (playerLevel >= 10) {
      document.getElementById("profBonus").value = 5;
    } else if (playerLevel >= 7) {
      document.getElementById("profBonus").value = 4;
    } else if (playerLevel >= 4) {
      document.getElementById("profBonus").value = 3;
    } else if (playerLevel >= 1) {
      document.getElementById("profBonus").value = 2;
    } else if (playerLevel >=0)  {
      document.getElementById("profBonus").value = 1;
    }
    
  }
  
  function setSkills() {
     var profBonus = parseInt(document.getElementById("profBonus").value);
     var strMod = parseInt(document.getElementById("strMod").value);
     var dexMod = parseInt(document.getElementById("dexMod").value);
     var conMod = parseInt(document.getElementById("conMod").value);
     var intMod = parseInt(document.getElementById("intMod").value);
     var wisMod = parseInt(document.getElementById("wisMod").value);
     var chaMod = parseInt(document.getElementById("chaMod").value);
    
    if (document.getElementById("acroProf").checked == true) {
      document.getElementById("acroScore").value = strMod + profBonus;
    } else {
      document.getElementById("acroScore").value = strMod;
    }
    if (document.getElementById("animProf").checked == true) {
      document.getElementById("animScore").value = dexMod + profBonus;
    } else {
      document.getElementById("animScore").value = dexMod;
    }
    if (document.getElementById("arcaProf").checked == true) {
      document.getElementById("arcaScore").value = conMod + profBonus;
    } else {
      document.getElementById("arcaScore").value = conMod;
    }
    if (document.getElementById("athlProf").checked == true) {
      document.getElementById("athlScore").value = intMod + profBonus;
    } else {
      document.getElementById("athlScore").value = intMod;
    }
    if (document.getElementById("decProf").checked == true) {
      document.getElementById("decScore").value = wisMod + profBonus;
    } else {
      document.getElementById("decScore").value = wisMod;
    }
    if (document.getElementById("hisProf").checked == true) {
      document.getElementById("hisScore").value = chaMod + profBonus;
    } else {
      document.getElementById("hisScore").value = chaMod;
    }
    if (document.getElementById("insProf").checked == true) {
      document.getElementById("insScore").value = strMod + profBonus;
    } else {
      document.getElementById("insScore").value = strMod;
    }
    if (document.getElementById("intiProf").checked == true) {
      document.getElementById("intiScore").value = dexMod + profBonus;
    } else {
      document.getElementById("intiScore").value = dexMod;
    }
    if (document.getElementById("invProf").checked == true) {
      document.getElementById("invScore").value = conMod + profBonus;
    } else {
      document.getElementById("invScore").value = conMod;
    }
    if (document.getElementById("medProf").checked == true) {
      document.getElementById("medScore").value = intMod + profBonus;
    } else {
      document.getElementById("medScore").value = intMod;
    }
    if (document.getElementById("natProf").checked == true) {
      document.getElementById("natScore").value = wisMod + profBonus;
    } else {
      document.getElementById("natScore").value = wisMod;
    }
    if (document.getElementById("sleiProf").checked == true) {
      document.getElementById("sleiScore").value = chaMod + profBonus;
    } else {
      document.getElementById("sleiScore").value = chaMod;
    }
  
    
  
    
  
  }
  
  function equipArmor(equippedArmor) {
    var armor = equippedArmor.value;
    if (armor == 'padded') {
      document.getElementById("armorClass").value = parseInt(document.getElementById("dexMod").value) + 11;
    } else if (armor == 'leather') {
      document.getElementById("armorClass").value = parseInt(document.getElementById("dexMod").value) + 11;
    } else if (armor == 'studded') {
      document.getElementById("armorClass").value = parseInt(document.getElementById("dexMod").value) + 12;
    } else if (armor == 'hide') {
      var tempArmor = parseInt(document.getElementById("dexMod").value) + 12;
      if (tempArmor > 14) {
         document.getElementById("armorClass").value = 14;
      } else {
       document.getElementById("armorClass").value = tempArmor; 
      }
    } else if (armor == 'chain') {
      var tempArmor = parseInt(document.getElementById("dexMod").value) + 13;
      if (tempArmor > 15) {
         document.getElementById("armorClass").value = 15;
      } else {
       document.getElementById("armorClass").value = tempArmor; 
      }
    } else if (armor == 'scale') {
      var tempArmor = parseInt(document.getElementById("dexMod").value) + 14;
      if (tempArmor > 15) {
         document.getElementById("armorClass").value = 15;
      } else {
       document.getElementById("armorClass").value = tempArmor; 
      }
    } else if (armor == 'breastplate') {
      var tempArmor = parseInt(document.getElementById("dexMod").value) + 14;
      if (tempArmor > 16) {
         document.getElementById("armorClass").value = 16;
      } else {
       document.getElementById("armorClass").value = tempArmor; 
      }
    } else if (armor == 'halfplate') {
      var tempArmor = parseInt(document.getElementById("dexMod").value) + 15;
      if (tempArmor > 17) {
         document.getElementById("armorClass").value = 17;
      } else {
       document.getElementById("armorClass").value = tempArmor; 
      }
    } else if (armor == 'ringmail') {
      document.getElementById("armorClass").value = 14;
    } else if (armor == 'chainmail') {
          var tempArmor = parseInt(document.getElementById("dexMod").value) + 15;
      if (tempArmor > 16) {
         document.getElementById("armorClass").value = 16;
      } else {
       document.getElementById("armorClass").value = tempArmor; 
      }
    } else if (armor == 'splint') {
          var tempArmor = parseInt(document.getElementById("dexMod").value) + 16;
      if (tempArmor > 17) {
         document.getElementById("armorClass").value = 17;
      } else {
       document.getElementById("armorClass").value = tempArmor; 
      }
    } else if (armor == 'plate') {
          var tempArmor = parseInt(document.getElementById("dexMod").value) + 18;
      if (tempArmor > 19) {
         document.getElementById("armorClass").value = 19;
      } else {
       document.getElementById("armorClass").value = tempArmor; 
      }
    } else {
      document.getElementById("armorClass").value = parseInt(document.getElementById("dexMod").value) + 10;
    }
  }
  
  function shieldEquip(equippedShield) {
    var shield = equippedShield.value;
    if (shield == 'none') 
    {document.getElementById("dmgRed").value = 0;}
    
    if (shield == 'buck') 
    {document.getElementById("dmgRed").value = 1;}
   
     if (shield == 'kshield') 
    {document.getElementById("dmgRed").value = 2;}
    
      if (shield == 'ishield') 
    {document.getElementById("dmgRed").value = 3;}
  }
  
  function playerLevelChange() {
    updateProfBonus();
    updateModifiers();
    setSkills();
    resetHP();
    resetHitDice();
   
  }
    
  function takeDamage() {
        var amount = parseInt(document.getElementById("modHP").value) || 0;
        var currenttempHP = parseInt(document.getElementById("currenttempHP").value) || 0;
        var currentHP = parseInt(document.getElementById("currentHP").value) || 0;
        var dmgredu = parseInt(document.getElementById("dmgRed").value) || 0;
        
        var damage = amount - dmgredu;
        if (damage < 0) {
            damage = 0;
        }
        
        if (currenttempHP > 0) {
            if (currenttempHP >= damage) {
                document.getElementById("currenttempHP").value = currenttempHP - damage;
            } else {
                damage -= currenttempHP;
                document.getElementById("currenttempHP").value = 0;
                document.getElementById("currentHP").value = currentHP - damage;
            }
        } else {
            document.getElementById("currentHP").value = currentHP - damage;
        }
  }

  function takeMana() {
    var amount = document.getElementById("modMana").value;
    var currentMana = document.getElementById("currentMana").value;
    if ((currentMana - amount) >= 0) {
      document.getElementById("currentMana").value = (currentMana - amount);
    } else {
  
    }
  }
  
  function healHP() {
    var amount = parseInt(document.getElementById("modHP").value);
    var currentHP = parseInt(document.getElementById("currentHP").value);
    var maxHP = parseInt(document.getElementById("maxHP").value);
    if((currentHP + amount) <= maxHP) {
      document.getElementById("currentHP").value = currentHP + amount;
    } else {
      document.getElementById("currentHP").value = maxHP;
    }
  }
  
  function healMana() {
    var amount = parseInt(document.getElementById("modMana").value);
    var currentMana = parseInt(document.getElementById("currentMana").value);
    var maxMana = parseInt(document.getElementById("maxMana").value);
    if((currentMana + amount) <= maxMana) {
      document.getElementById("currentMana").value = currentMana + amount;
    } else {
      document.getElementById("currentMana").value = maxMana;
    }
  }
  
  function longRest() {
  resetHP();
   resetHitDice(); 
    resetMana();
    
  }
  
  function shortRest() {
    var currentDice = parseInt(document.getElementById("hitDice").value);
    if (currentDice > 0) {
      var currentHP = parseInt(document.getElementById("currentHP").value);
      var maxHP = parseInt(document.getElementById("maxHP").value);
      var maxDie = parseInt(document.getElementById("hitDie").value);
      var hitDieRoll = Math.floor(Math.random() * Math.floor(maxDie) +1);
      if ((currentHP + hitDieRoll) <= maxHP) {
        document.getElementById("currentHP").value = currentHP + hitDieRoll;
      } else {
        document.getElementById("currentHP").value = maxHP;
      }
      document.getElementById("hitDice").value = currentDice - 1;
    }
  }
  
  function shortRestmana() {
    var currentDice = parseInt(document.getElementById("hitDice").value);
    if (currentDice > 0) {
      var currentMana = parseInt(document.getElementById("currentMana").value);
      var maxMana = parseInt(document.getElementById("maxMana").value);
      var maxDie = parseInt(document.getElementById("hitDie").value);
      var hitDieRoll = Math.floor(Math.random() * Math.floor(maxDie) +1);
      if ((currentMana + hitDieRoll) <= maxMana) {
        document.getElementById("currentMana").value = currentMana + hitDieRoll;
      } else {
        document.getElementById("currentMana").value = maxMana;
      }
      document.getElementById("hitDice").value = currentDice - 1;
    }
  }
  
  function resetHP() {
    document.getElementById("currentHP").value = document.getElementById("maxHP").value;
  }
  
  function resetMana() {
    document.getElementById("currentMana").value = document.getElementById("maxMana").value;
  }
  
  function resetHitDice() {
    document.getElementById("hitDice").value = document.getElementById("playerLevel").value;
  }
  
  function loseStats() {
    var statPoints = parseInt(document.getElementById("statPoints").value);
    if (statPoints >0) { 
      document.getElementById("statPoints").value = parseInt(document.getElementById("statPoints").value)- 1;}
      
  }

  
 
  
  function addStat() {
    var statPoints = parseInt(document.getElementById("statPoints").value);
    { 
      document.getElementById("statPoints").value = parseInt(document.getElementById("statPoints").value)+ 1;}
  
  }

  function addLevel() {
    var playerLevel = parseInt(document.getElementById("playerLevel").value);
    if (playerLevel >= 0 && playerLevel <= 9) {
      document.getElementById("playerLevel").value = parseInt(document.getElementById("playerLevel").value)+ 1;
      document.getElementById("statPoints").value = parseInt(document.getElementById("statPoints").value)+2;
    }
    updateProfBonus();
    updateModifiers();
    setSkills();
    resetHP();
    resetHitDice();
 
   
  }

  function increasestr() {
    var strScore = parseInt(document.getElementById("strScore").value);
    var statPoints = parseInt(document.getElementById("statPoints").value);
    if (statPoints > 0) {
        console.log("Stat points have been lowered or changed!");
        document.getElementById("strScore").value = strScore + 1;
        document.getElementById("statPoints").value = statPoints - 1;
    }

  }

  function increasedex() {
    var dexScore = parseInt(document.getElementById("dexScore").value);
    var statPoints = parseInt(document.getElementById("statPoints").value);
    if (statPoints > 0) {
        console.log("Stat points have been lowered or changed!");
        document.getElementById("dexScore").value = dexScore + 1;
        document.getElementById("statPoints").value = statPoints - 1;
    }
  }
  function increasecon() {
    var conScore = parseInt(document.getElementById("conScore").value);
    var statPoints = parseInt(document.getElementById("statPoints").value);
    if (statPoints > 0) {
        console.log("Stat points have been lowered or changed!");
        document.getElementById("conScore").value = conScore + 1;
        document.getElementById("statPoints").value = statPoints - 1;
    }
  }
  function increaseint() {
    var intScore = parseInt(document.getElementById("intScore").value);
    var statPoints = parseInt(document.getElementById("statPoints").value);
    if (statPoints > 0) {
        console.log("Stat points have been lowered or changed!");
        document.getElementById("intScore").value = intScore + 1;
        document.getElementById("statPoints").value = statPoints - 1;
    }
  }
  function increasewis() {
    var wisScore = parseInt(document.getElementById("wisScore").value);
    var statPoints = parseInt(document.getElementById("statPoints").value);
    if (statPoints > 0) {
        console.log("Stat points have been lowered or changed!");
        document.getElementById("wisScore").value = wisScore + 1;
        document.getElementById("statPoints").value = statPoints - 1;
    }
  }
  function increasecha() {
    var chaScore = parseInt(document.getElementById("chaScore").value);
    var statPoints = parseInt(document.getElementById("statPoints").value);
    if (statPoints > 0) {
        console.log("Stat points have been lowered or changed!");
        document.getElementById("chaScore").value = chaScore + 1;
        document.getElementById("statPoints").value = statPoints - 1;
    }
  }
//decrease//
function decreasestr() {
  var strScore = parseInt(document.getElementById("strScore").value);
  var statPoints = parseInt(document.getElementById("statPoints").value);
   {
      console.log("Stat points have been lowered or changed!");
      document.getElementById("strScore").value = strScore - 1;
  
  }

}

function decreasedex() {
  var dexScore = parseInt(document.getElementById("dexScore").value);
  var statPoints = parseInt(document.getElementById("statPoints").value);
   {
      console.log("Stat points have been lowered or changed!");
      document.getElementById("dexScore").value = dexScore - 1;
   
  }
}
function decreasecon() {
  var conScore = parseInt(document.getElementById("conScore").value);
  var statPoints = parseInt(document.getElementById("statPoints").value);
   {
      console.log("Stat points have been lowered or changed!");
      document.getElementById("conScore").value = conScore - 1;
     
  }
}
function decreaseint() {
  var intScore = parseInt(document.getElementById("intScore").value);
  var statPoints = parseInt(document.getElementById("statPoints").value);
  {
      console.log("Stat points have been lowered or changed!");
      document.getElementById("intScore").value = intScore - 1;
     
  }
}
function decreasewis() {
  var wisScore = parseInt(document.getElementById("wisScore").value);
  var statPoints = parseInt(document.getElementById("statPoints").value);
   {
      console.log("Stat points have been lowered or changed!");
      document.getElementById("wisScore").value = wisScore - 1;
      
  }
}
function decreasecha() {
  var chaScore = parseInt(document.getElementById("chaScore").value);
  var statPoints = parseInt(document.getElementById("statPoints").value);
   {
      console.log("Stat points have been lowered or changed!");
      document.getElementById("chaScore").value = chaScore - 1;
      
  }
}

function hidespells() {
  var div = document.getElementById('spells'); // Get the textarea
  var label = document.getElementById('spellsLabel'); // Get the label

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the textarea
    label.style.display = 'block'; // Show the label
  } else {
    div.style.display = 'none'; // Hide the textarea
    label.style.display = 'none'; // Hide the label
  }
}

function hiderecipes() {
  var recipeIds = ['recipes'];
  recipeIds.forEach(function(id) {
      var element = document.getElementById(id);
      
      // Toggle visibility
      if (element.style.display === 'none' || element.style.display === '') {
          element.style.display = 'table-row-group';  // Default display for tbody
      } else {
          element.style.display = 'none';  // Hide the element
      }
  });
}

function hiderecipes1() {
  var recipeIds = ['recipes1'];
  recipeIds.forEach(function(id) {
      var element = document.getElementById(id);
      
      // Toggle visibility
      if (element.style.display === 'none' || element.style.display === '') {
          element.style.display = 'table-row-group';  // Default display for tbody
      } else {
          element.style.display = 'none';  // Hide the element
      }
  });
}

function hiderecipes2() {
  var recipeIds = ['recipes2'];
  recipeIds.forEach(function(id) {
      var element = document.getElementById(id);
      
      // Toggle visibility
      if (element.style.display === 'none' || element.style.display === '') {
          element.style.display = 'table-row-group';  // Default display for tbody
      } else {
          element.style.display = 'none';  // Hide the element
      }
  });
}

function hiderecipes3() {
  var recipeIds = ['recipes3'];
  recipeIds.forEach(function(id) {
      var element = document.getElementById(id);
      
      // Toggle visibility
      if (element.style.display === 'none' || element.style.display === '') {
          element.style.display = 'table-row-group';  // Default display for tbody
      } else {
          element.style.display = 'none';  // Hide the element
      }
  });
}

function hiderecipes4() {
  var recipeIds = ['recipes4'];
  recipeIds.forEach(function(id) {
      var element = document.getElementById(id);
      
      // Toggle visibility
      if (element.style.display === 'none' || element.style.display === '') {
          element.style.display = 'table-row-group';  // Default display for tbody
      } else {
          element.style.display = 'none';  // Hide the element
      }
  });
}

function hidelang() {
  var div = document.getElementById('langs'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidetoolkits() {
  var div = document.getElementById('toolkits'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hideacid() {
  var div = document.getElementById('acid'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidealchemistfire() {
  var div = document.getElementById('alchemistfire'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hideinvispotion() {
  var div = document.getElementById('invispotion'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidepolypotion() {
  var div = document.getElementById('polypotion'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidenaturald() {
  var div = document.getElementById('naturald'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidetalosd() {
  var div = document.getElementById('talosd'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidelocketd() {
  var div = document.getElementById('locketd'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hideantibrew() {
  var div = document.getElementById('antibrew'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hideaphrodisiac() {
  var div = document.getElementById('aphrodisiac'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidebottledrest() {
  var div = document.getElementById('bottledrest'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hideambrosia() {
  var div = document.getElementById('ambrosia'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidebrewvitality() {
  var div = document.getElementById('brewvitality'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidedwellenbrew() {
  var div = document.getElementById('dwellenbrew'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidelightbottle() {
  var div = document.getElementById('lightbottle'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hideantitoxin() {
  var div = document.getElementById('antitoxin'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}


function hidepanacea() {
  var div = document.getElementById('panacea'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidehealingelixir() {
  var div = document.getElementById('healingelixir'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hideinvelixir() {
  var div = document.getElementById('invelixir'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidetruthelixir() {
  var div = document.getElementById('truthelixir'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidebasicpoison() {
  var div = document.getElementById('basicpoison'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidedwellerdust() {
  var div = document.getElementById('dwellerdust'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hideichariivenom() {
  var div = document.getElementById('ichariivenom'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

function hidemalevolence() {
  var div = document.getElementById('malevolence'); // Get the element

  // Check the current display state and toggle it
  if (div.style.display === 'none' || div.style.display === '') {
    div.style.display = 'block'; // Show the element
  } else {
    div.style.display = 'none'; // Hide the element
  }
}

document.getElementById("experience").addEventListener("input", function(e) {
  // Remove any non-numeric characters except commas
  let rawValue = e.target.value.replace(/,/g, '');
  
  // If the value is numeric, format it with commas
  if (!isNaN(rawValue) && rawValue !== "") {
    e.target.value = Number(rawValue).toLocaleString();
  }
});

