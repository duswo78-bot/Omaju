import { matchCorpus } from '../../nlu/normalizeKorean.js';
import { matchWeather } from './weather.js';
import { matchEmotion } from './emotion.js';
import { expandDrinkSlang } from './drinkSlang.js';
import { matchIdioms } from './idiom.js';

/**
 * Phase1: 한국어 표현 annotate
 * @param {string} rawText
 */
export function annotateGlossary(rawText) {
  // 은어는 정규화 전에 먼저 펼침 (치맥각 → 치맥 먼저 깨지는 것 방지)
  const slang = expandDrinkSlang(rawText || '');
  const corpus = matchCorpus(slang.expanded || rawText || '');
  const hay = `${corpus.normalized} ${corpus.compact} ${corpus.raw} ${rawText || ''}`.toLowerCase();

  const weather = matchWeather(hay);
  const emotion = matchEmotion(hay);
  const idioms = matchIdioms(hay);

  return {
    raw: String(rawText || ''),
    normalized: corpus.normalized,
    compact: corpus.compact,
    haystack: hay,
    weather,
    emotion,
    slangHits: slang.hits,
    idioms,
  };
}
