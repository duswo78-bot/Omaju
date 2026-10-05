import { isDeclineAlcohol } from './src/workers/nlu/ruleNlu.js';
import { ruleNlu } from './src/workers/nlu/ruleNlu.js';

console.log('--- Test 13: Non-alcoholic ---');
console.log('isDeclineAlcohol:', isDeclineAlcohol('알코올은 1도 안 되고', '알코올은 1도 안 되고'));
const res13 = ruleNlu('알코올은 1도 안 되고', '알코올은1도안되고');
console.log('Intent:', res13.intent, '| nonAlcoholic:', res13.constraints.nonAlcoholic);

console.log('\n--- Test 14: Flex (Promotion) ---');
const res14 = ruleNlu('오늘 드디어 과장 승진했어! 나한테 제대로 플렉스하고 싶다 ㅎㅎ', '오늘드디어과장승진했어!나한테제대로플렉스하고싶다ㅎㅎ');
console.log('Intent:', res14.intent, '| Moods:', res14.signals.moods);
