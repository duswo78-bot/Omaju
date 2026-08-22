// 텍스트 정제
export function cleanTextString(text) {
  return text.replace(/[\s?.,!~]/g, '');
}
