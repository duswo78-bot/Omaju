const a = require('./src/data/alcohols.json'); 
const s = require('./src/data/snacks.json'); 
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]; 

for(let i=0; i<10; i++) { 
    let bestAlc=pickRandom(a); 
    let bestSnack=pickRandom(s); 
    const alcTags = [...bestAlc.tags].sort(() => 0.5 - Math.random()).slice(0, 2); 
    const snkTags = [...bestSnack.tags].sort(() => 0.5 - Math.random()).slice(0, 2); 
    const comboReasons = [
        `오늘은 **${bestAlc.name_ko}**에 **${bestSnack.name_ko}** 어떠세요? ${alcTags.join(', ')} 매력의 술 한 잔에 ${snkTags.join(', ')} 느낌의 안주를 곁들이면 분위기가 정말 끝내주거든요!`,
        `이런 날에는 ${alcTags[0]} 느낌 낭낭한 **${bestAlc.name_ko}** 한 잔 쫙 들이켜고, ${snkTags[0]} 매력이 터지는 **${bestSnack.name_ko}** 한 입 곁들이는 게 진리죠. 완전 강추합니다!`,
        `제 생각엔 **${bestAlc.name_ko}** 한 잔 기울이면서 **${bestSnack.name_ko}** 드시는 게 어떨까 싶어요. ${alcTags[0]} 술과 ${snkTags[0]} 안주의 밸런스가 정말 좋아서 후회 안 하실 거예요.`,
        `오늘의 제 픽(Pick)은 **${bestAlc.name_ko}**와(과) **${bestSnack.name_ko}**입니다! 🍷 ${alcTags.join(' 혹은 ')} 분위기 낼 때 이만한 게 없고, 거기에 ${snkTags.join(' 느낌이 나는 ')} 안주까지 더해지면 정말 완벽한 하루 마무리가 될 거예요.`,
        `지금 이 타이밍엔 무조건 **${bestAlc.name_ko}**에 **${bestSnack.name_ko}** 조합으로 가시죠! 매력적인 ${snkTags[0]} 맛이 ${alcTags[0]} 술맛을 싹 감싸주면서 입안이 엄청 즐거워질 거라 확신합니다.`,
        `혹시 **${bestAlc.name_ko}** 좋아하시나요? 여기에 **${bestSnack.name_ko}** 곁들여서 드셔보세요. ${alcTags[0]} 풍미랑 ${snkTags[0]} 식감이 어우러져서 진짜 꿀맛탱이거든요! 😋`,
        `제가 바텐더라면 주저 없이 **${bestAlc.name_ko}**와 **${bestSnack.name_ko}** 조합을 내어드릴 거예요. ${alcTags.join(', ')} 특징이 있는 술이 ${snkTags[0]} 매력을 가진 안주랑 만났을 때 시너지가 엄청나거든요.`
    ];
    console.log(pickRandom(comboReasons)); 
}
