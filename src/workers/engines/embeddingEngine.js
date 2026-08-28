import { pipeline, env } from '@xenova/transformers';
import alcoholsData from '../../data/alcohols.json';
import snacksData from '../../data/snacks.json';
import gamesData from '../../data/games.json';

// 브라우저 캐시 활성화 (다운로드 1회만 되도록 보장)
env.allowLocalModels = false;
env.useBrowserCache = true;

class AIPipeline {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

// Embeddings caches
let alcoholEmbeddings = [];
let snackEmbeddings = [];
let gameEmbeddings = [];

// IndexedDB Helper for Web Worker
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OmajuAI_DB', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('embeddings')) {
        db.createObjectStore('embeddings');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getCache(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('embeddings', 'readonly');
    const store = tx.objectStore('embeddings');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function setCache(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('embeddings', 'readwrite');
    const store = tx.objectStore('embeddings');
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function initEmbeddings(postMessage) {
  const db = await openDB();
  
  // 캐시 확인
  const cacheMeta = await getCache(db, 'embeddingMeta');
  const expectedMeta = {
    alcoholCount: alcoholsData.length,
    snackCount: snacksData.length,
    gameCount: gamesData.length,
    version: 3,
  };
  const cachedAlcohols = await getCache(db, 'alcoholEmbeddings');
  const cachedSnacks = await getCache(db, 'snackEmbeddings');
  const cachedGames = await getCache(db, 'gameEmbeddings');
  const metaMatches =
    cacheMeta &&
    cacheMeta.version === expectedMeta.version &&
    cacheMeta.alcoholCount === expectedMeta.alcoholCount &&
    cacheMeta.snackCount === expectedMeta.snackCount &&
    cacheMeta.gameCount === expectedMeta.gameCount;

  const snacksGamesOk =
    cacheMeta &&
    cacheMeta.version === expectedMeta.version &&
    cacheMeta.snackCount === expectedMeta.snackCount &&
    cacheMeta.gameCount === expectedMeta.gameCount &&
    cachedSnacks &&
    cachedGames;

  if (metaMatches && cachedAlcohols && cachedSnacks && cachedGames) {
    alcoholEmbeddings = cachedAlcohols;
    snackEmbeddings = cachedSnacks;
    gameEmbeddings = cachedGames;
    // 백그라운드에서 모델 인스턴스만 로드해둠 (쿼리 처리용)
    AIPipeline.getInstance();
    postMessage({ type: 'progress', data: { status: 'downloading', progress: 100 } });
    return;
  }

  // 주류만 늘었을 때: 안주/게임 캐시 재사용 + 주류 증분 임베딩 (전체 재계산으로 인한 실패/지연 방지)
  if (snacksGamesOk && cachedAlcohols?.length) {
    const extractor = await AIPipeline.getInstance((x) => {
      postMessage({ type: 'progress', data: x });
    });
    const byId = new Map(
      (cachedAlcohols || [])
        .filter((row) => row?.item?.id && row?.vector)
        .map((row) => [row.item.id, row.vector])
    );
    alcoholEmbeddings = [];
    for (const alc of alcoholsData) {
      const cachedVec = byId.get(alc.id);
      if (cachedVec) {
        alcoholEmbeddings.push({ item: alc, vector: cachedVec });
        continue;
      }
      const textToEmbed = `${alc.name_ko} ${alc.category} ${(alc.tags || []).join(' ')} ${(alc.moods || []).join(' ')}`;
      const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
      alcoholEmbeddings.push({ item: alc, vector: Array.from(output.data) });
    }
    snackEmbeddings = cachedSnacks;
    gameEmbeddings = cachedGames;
    await setCache(db, 'alcoholEmbeddings', alcoholEmbeddings);
    await setCache(db, 'snackEmbeddings', snackEmbeddings);
    await setCache(db, 'gameEmbeddings', gameEmbeddings);
    await setCache(db, 'embeddingMeta', expectedMeta);
    postMessage({ type: 'progress', data: { status: 'downloading', progress: 100 } });
    return;
  }

  // 캐시가 없으면 모델을 로드하여 계산 (최초 1회만 실행됨)
  const extractor = await AIPipeline.getInstance(x => {
    postMessage({ type: 'progress', data: x });
  });

  alcoholEmbeddings = [];
  snackEmbeddings = [];
  gameEmbeddings = [];

  // 주류 임베딩
  for (const alc of alcoholsData) {
    const textToEmbed = `${alc.name_ko} ${alc.category} ${(alc.tags || []).join(' ')} ${(alc.moods || []).join(' ')}`;
    const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
    alcoholEmbeddings.push({ item: alc, vector: Array.from(output.data) });
  }

  // 안주 임베딩
  for (const snk of snacksData) {
    const textToEmbed = `${snk.name_ko} ${snk.category} ${(snk.tags || []).join(' ')} ${snk.moods?.join(' ') || ''}`;
    const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
    snackEmbeddings.push({ item: snk, vector: Array.from(output.data) });
  }

  // 게임 임베딩
  for (const g of gamesData) {
    const textToEmbed = `${g.name} ${(g.tags || []).join(' ')}`;
    const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
    gameEmbeddings.push({ item: g, vector: Array.from(output.data) });
  }

  // 계산된 임베딩을 DB에 저장 (다음 로딩을 0.1초로 단축)
  await setCache(db, 'alcoholEmbeddings', alcoholEmbeddings);
  await setCache(db, 'snackEmbeddings', snackEmbeddings);
  await setCache(db, 'gameEmbeddings', gameEmbeddings);
  await setCache(db, 'embeddingMeta', expectedMeta);
}

export async function embedQuery(text) {
  // Node/시뮬: 모델 없이 키워드 점수만 쓸 때 0벡터
  if (typeof indexedDB === 'undefined' || !alcoholEmbeddings.length) {
    return new Array(384).fill(0);
  }
  const extractor = await AIPipeline.getInstance();
  const queryOut = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(queryOut.data);
}

/** Node 회귀/시뮬용: 임베딩 모델 없이 카탈로그만 시드 */
export function seedMockEmbeddings() {
  const dim = 384;
  const zero = () => new Array(dim).fill(0);
  alcoholEmbeddings = alcoholsData.map((item) => ({ item, vector: zero() }));
  snackEmbeddings = snacksData.map((item) => ({ item, vector: zero() }));
  gameEmbeddings = gamesData.map((item) => ({ item, vector: zero() }));
}

export function getAlcoholEmbeddings() {
  return alcoholEmbeddings;
}

export function getSnackEmbeddings() {
  return snackEmbeddings;
}

export function getGameEmbeddings() {
  return gameEmbeddings;
}
