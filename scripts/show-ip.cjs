const os = require('os');
const nets = os.networkInterfaces();

console.log('[ 접속 가능한 네트워크 주소 ]');

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      let type = name;
      const lowerName = name.toLowerCase();
      
      if (lowerName.includes('wi-fi') || lowerName.includes('wlan')) {
        type = 'Wi-Fi (📱 모바일 접속 권장)';
      } else if (lowerName.includes('ethernet')) {
        type = 'Ethernet (💻 PC 유선랜)';
      } else if (lowerName.includes('vmware') || lowerName.includes('virtual')) {
        type = 'Virtual Machine (무시)';
      }
      
      console.log(`- ${type} : http://${net.address}:5173`);
    }
  }
}

console.log('\n모바일 기기로 접속하려면 스마트폰을 위 Wi-Fi에 연결 후 링크를 브라우저에 입력하세요.\n');
