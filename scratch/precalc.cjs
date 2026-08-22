const fs = require('fs');

import('@xenova/transformers').then(async ({ pipeline, env }) => {
    env.allowLocalModels = false;
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    const alcohols = JSON.parse(fs.readFileSync('src/data/alcohols.json', 'utf8'));
    const snacks = JSON.parse(fs.readFileSync('src/data/snacks.json', 'utf8'));
    const games = JSON.parse(fs.readFileSync('src/data/games.json', 'utf8'));

    const embeddings = {
        alcoholEmbeddings: {},
        snackEmbeddings: {},
        gameEmbeddings: {}
    };

    console.log(`Processing ${alcohols.length} alcohols...`);
    for (const item of alcohols) {
        const doc = `${item.name_ko} ${item.name_en} ${item.category} ${item.tags.join(' ')} ${item.moods.join(' ')} ${item.weather.join(' ')}`;
        const out = await extractor(doc, { pooling: 'mean', normalize: true });
        embeddings.alcoholEmbeddings[item.id] = Array.from(out.data).map(n => Number(n.toFixed(5)));
    }

    console.log(`Processing ${snacks.length} snacks...`);
    for (const item of snacks) {
        const doc = `${item.name_ko} ${item.name_en} ${item.category} ${item.tags.join(' ')} ${item.moods.join(' ')} ${item.weather.join(' ')}`;
        const out = await extractor(doc, { pooling: 'mean', normalize: true });
        embeddings.snackEmbeddings[item.id] = Array.from(out.data).map(n => Number(n.toFixed(5)));
    }

    console.log(`Processing ${games.length} games...`);
    for (const item of games) {
        const doc = `${item.name} ${item.description} ${item.tags.join(' ')}`;
        const out = await extractor(doc, { pooling: 'mean', normalize: true });
        embeddings.gameEmbeddings[item.id] = Array.from(out.data).map(n => Number(n.toFixed(5)));
    }

    fs.writeFileSync('src/data/embeddings.json', JSON.stringify(embeddings));
    console.log("Done!");
});
