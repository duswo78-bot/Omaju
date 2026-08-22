// 현재 가능한 상태들
const STATES = {
  IDLE: 'IDLE',
  ASKING: 'ASKING', // 향후 확장
  RECOMMENDING: 'RECOMMENDING', // 향후 확장
  AWAITING_REC_CONFIRM: 'AWAITING_REC_CONFIRM',
  FOLLOWUP: 'FOLLOWUP', // 향후 확장
  ENDED: 'ENDED' // 향후 확장
};

let currentState = STATES.IDLE;

export function getState() {
  return currentState;
}

export function setState(newState) {
  if (STATES[newState]) {
    currentState = newState;
  } else {
    console.warn(`Invalid state: ${newState}`);
  }
}

export function isState(state) {
  return currentState === state;
}

export { STATES };
