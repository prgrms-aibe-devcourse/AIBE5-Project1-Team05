// Firebase Configuration
// Firebase Web SDK를 사용하여 Firestore 데이터 가져오기

// ⚠️ 보안 참고사항:
// - 실제 Firebase 설정 정보는 firebase-secrets.js 파일에 저장됩니다
// - firebase-secrets.js 파일은 .gitignore에 추가되어 Git에 커밋되지 않습니다
// - 새로운 환경에서는 firebase-secrets.template.js를 복사하여 firebase-secrets.js를 생성하세요

// Firebase SDK는 HTML에서 직접 로드됨 (script 태그로 추가)
// Firebase 설정은 firebase-secrets.js에서 로드됨 (FIREBASE_SECRETS 변수 사용)
let firebaseConfig = {};

// firebase-secrets.js 파일에서 설정 로드
if (typeof FIREBASE_SECRETS !== 'undefined') {
    firebaseConfig = FIREBASE_SECRETS;
    console.log('Firebase 설정 로드 완료 (firebase-secrets.js)');
} else {
    console.error('⚠️ Firebase 설정을 찾을 수 없습니다!');
    console.error('firebase-secrets.js 파일이 로드되었는지 확인하세요.');
    console.error('새로운 환경이라면 firebase-secrets.template.js를 복사하여 firebase-secrets.js를 생성하고 실제 값을 입력하세요.');
}

// Firebase 초기화
let db = null;
let isFirebaseInitialized = false;

function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK가 로드되지 않았습니다. HTML에 Firebase SDK script를 추가하세요.');
            return false;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        db = firebase.firestore();
        isFirebaseInitialized = true;
        console.log('Firebase 초기화 성공');
        return true;
    } catch (error) {
        console.error('Firebase 초기화 실패:', error);
        return false;
    }
}

// Firestore에서 places 데이터 가져오기
async function fetchPlacesFromFirestore() {
    if (!isFirebaseInitialized && !initializeFirebase()) {
        console.error('Firebase가 초기화되지 않았습니다.');
        return [];
    }

    try {
        const placesSnapshot = await db.collection('places').get();
        const places = [];

        placesSnapshot.forEach(doc => {
            const data = doc.data();
            places.push({
                id: doc.id,
                name: data.name,
                category: data.category,
                description: data.description,
                shortDesc: data.shortDesc,
                address: data.location?.address || '',
                district: data.location?.district || '',
                lat: data.location?.lat || 0,
                lng: data.location?.lng || 0,
                congestion: data.congestion?.level || 'unknown', // quiet, normal, crowded, unknown
                congestionMsg: data.congestion?.msg || '',
                congestionLastUpdated: data.congestion?.lastUpdated || '',
                ppltnMin: data.congestion?.ppltnMin || '',
                ppltnMax: data.congestion?.ppltnMax || '',
                tags: data.features || [],
                features: data.features || [],
                hours: data.details?.hours || '',
                admission: data.details?.fee || '',
                images: data.images || [],
                rating: data.stats?.rating || 0,
                originalName: data.originalName || data.name,
                recommendTime: data.recommendTime || ''
            });
        });

        console.log(`Firestore에서 ${places.length}개의 장소 데이터를 가져왔습니다.`);
        return places;
    } catch (error) {
        console.error('Firestore 데이터 가져오기 실패:', error);
        return [];
    }
}

// 혼잡도 레벨에 따른 색상 반환
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

// 혼잡도 레벨에 따른 한글 텍스트 반환
function getCongestionText(level) {
    const texts = {
        'quiet': '한산함',
        'normal': '보통',
        'crowded': '혼잡',
        'very_crowded': '매우 혼잡',
        'unknown': '정보 없음'
    };

    return texts[level] || texts['unknown'];
}
