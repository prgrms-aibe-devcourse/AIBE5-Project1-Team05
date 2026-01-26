# Firebase 지도 마커 통합 가이드

이 문서는 Firebase Firestore의 places 데이터를 서울 지도에 혼잡도 마커로 표시하는 기능을 사용하는 방법을 설명합니다.

## 📋 개요

Firebase Firestore에서 여행지 데이터를 가져와 서울시 지도(구 단위/동 단위)에 혼잡도 정보를 색상으로 표시하는 마커를 추가했습니다.

## 🔧 구현된 기능

### 1. Firebase 연동
- **파일**: `js/firebase-config.js`
- Firebase Web SDK (v8.x)를 사용하여 Firestore 접근
- places 컬렉션에서 데이터 자동 로드

### 2. 지도 마커 표시
- **파일**: `js/seoul-map.js` (수정됨)
- Firebase에서 가져온 실제 장소 데이터로 마커 표시
- 혼잡도에 따른 색상 자동 적용:
  - **초록색** (#4CAF50): quiet (한산함)
  - **노란색** (#FFC107): normal (보통)
  - **빨간색** (#F44336): crowded (혼잡)
  - **진한 빨간색** (#B71C1C): very_crowded (매우 혼잡)
  - **회색** (#9E9E9E): unknown (정보 없음)

### 3. 마커 인터랙션
- 마커 호버 시 확대 및 그림자 효과
- 마커 클릭 시 장소 상세 정보 표시 (알림 또는 모달)
- 툴팁으로 장소명과 혼잡도 표시

## 🚀 설정 방법

### 1단계: Firebase 프로젝트 설정 정보 입력

`js/firebase-config.js` 파일을 열고 Firebase Console에서 제공하는 실제 설정 정보로 교체하세요:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",                          // ← 여기에 실제 API Key 입력
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",   // ← 여기에 실제 Auth Domain 입력
    projectId: "YOUR_PROJECT_ID",                    // ← 여기에 실제 Project ID 입력
    storageBucket: "YOUR_PROJECT_ID.appspot.com",   // ← 여기에 실제 Storage Bucket 입력
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // ← 여기에 실제 Sender ID 입력
    appId: "YOUR_APP_ID"                            // ← 여기에 실제 App ID 입력
};
```

**Firebase 설정 정보 가져오는 방법:**
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. 프로젝트 설정(⚙️) → 일반 탭
4. "내 앱" 섹션에서 웹 앱 선택 (없으면 웹 앱 추가)
5. Firebase SDK 코드 스니펫에서 `firebaseConfig` 객체 복사

### 2단계: Firestore 보안 규칙 설정

Firebase Console에서 Firestore Database → 규칙 탭으로 이동하여 아래와 같이 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // places 컬렉션 읽기 허용 (공개)
    match /places/{placeId} {
      allow read: if true;  // 모든 사용자가 읽기 가능
      allow write: if false; // 쓰기는 불가 (관리자만 Firebase Admin SDK로 수정)
    }
  }
}
```

### 3단계: Firestore 데이터 구조 확인

places 컬렉션의 각 문서는 다음과 같은 구조여야 합니다:

```javascript
{
  "id": "10666639",
  "name": "응봉산",
  "category": "자연",
  "description": "설명...",
  "shortDesc": "짧은 설명",
  "location": {
    "address": "서울 성동구 응봉동",
    "district": "성동구",
    "lat": 37.5482528089186,
    "lng": 127.029834156041,
    "roadAddress": ""
  },
  "congestion": {
    "level": "quiet",  // quiet | normal | crowded | very_crowded
    "msg": "혼잡도 메시지",
    "lastUpdated": "2026-01-23 13:35",
    "ppltnMin": "2000",
    "ppltnMax": "2500"
  },
  "details": {
    "capacity": "2500",
    "fee": "무료",
    "homepage": "http://...",
    "hours": "상시 개방",
    "phone": ""
  },
  "features": ["특징1", "특징2"],
  "images": ["이미지URL1", "이미지URL2"],
  "stats": {
    "rating": 4.5
  }
}
```

**필수 필드**: `location.lat`, `location.lng`, `name`  
**혼잡도 표시에 사용**: `congestion.level`

## 📂 수정된 파일 목록

1. **js/firebase-config.js** (NEW)
   - Firebase 초기화 및 Firestore 연결
   - 혼잡도 색상/텍스트 변환 함수

2. **js/seoul-map.js** (MODIFIED)
   - `addRandomMarkers()` → `addPlaceMarkers()` (Firebase 데이터 사용)
   - 마커 클릭 이벤트 추가
   - 혼잡도 색상 자동 적용

3. **map.html** (MODIFIED)
   - Firebase SDK CDN 추가
   - firebase-config.js 로드

## 🎨 혼잡도 색상 커스터마이징

`js/firebase-config.js`의 `getCongestionColor()` 함수에서 색상을 변경할 수 있습니다:

```javascript
function getCongestionColor(level) {
    const colors = {
        'quiet': '#4CAF50',      // 초록색 - 한산함
        'normal': '#FFC107',     // 노란색 - 보통
        'crowded': '#F44336',    // 빨간색 - 혼잡
        'very_crowded': '#B71C1C', // 진한 빨간색 - 매우 혼잡
        'unknown': '#9E9E9E'     // 회색 - 알 수 없음
    };
    
    return colors[level] || colors['unknown'];
}
```

## 🧪 테스트 방법

1. `map.html` 파일을 브라우저에서 열기:
   ```
   file:///c:/aibe5/AIBE5-Project1-Team05-KimSunwoong/AIBE5-Project1-Team05-KimSunwoong/map.html
   ```

2. 브라우저 개발자 도구(F12) → Console 탭 확인:
   - Firebase 초기화 성공 메시지
   - Firestore에서 가져온 장소 개수
   - 마커 추가 완료 메시지

3. 지도에서 마커 확인:
   - 혼잡도에 따라 다른 색상으로 표시
   - 마커에 마우스를 올리면 확대
   - 마커 클릭 시 장소 정보 표시

## ❗ 문제 해결

### Firebase 초기화 오류
- **증상**: Console에 "Firebase SDK가 로드되지 않았습니다" 오류
- **해결**: 인터넷 연결 확인, CDN URL 확인

### 데이터를 가져오지 못함
- **증상**: "표시할 장소 데이터가 없습니다" 경고
- **해결**: 
  1. Firestore 보안 규칙 확인
  2. places 컬렉션에 데이터가 있는지 확인
  3. Firebase config 정보가 올바른지 확인

### 마커가 표시되지 않음
- **증상**: 지도는 보이지만 마커가 없음
- **해결**:
  1. Console에서 좌표 데이터 확인
  2. `location.lat`, `location.lng` 필드가 있는지 확인
  3. 좌표값이 서울 범위(lat: 37.4~37.7, lng: 126.7~127.2)인지 확인

## 📞 참고 자료

- [Firebase 웹 시작하기](https://firebase.google.com/docs/web/setup)
- [Cloud Firestore 문서](https://firebase.google.com/docs/firestore)
- [Naver Maps API](https://navermaps.github.io/maps.js/)

---

**작성일**: 2026-01-26  
**작성자**: Antigravity AI Assistant
