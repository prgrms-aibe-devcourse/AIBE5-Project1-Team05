// Seoul Map Controller
// Seoul Map Controller
const SeoulMap = (function () {
    let isInitialized = false;
    let naverMap = null;

    // State
    const cachedData = {
        dong: null,
        gu: null
    };
    let currentMode = 'dong'; // 'dong' or 'gu'

    // Data URLs
    const URLS = {
        dong: 'https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_submunicipalities_topo_simple.json',
        gu: 'https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_topo_simple.json'
    };

    // Helper: 혼잡도 배지 아이콘/텍스트
    function getCongestionBadge(level) {
        const badges = {
            'quiet': '●',
            'normal': '●●',
            'crowded': '●●●',
            'very_crowded': '!',
            'unknown': '?'
        };
        return badges[level] || '?';
    }

    // Mode Toggle Function
    async function setMode(mode) {
        if (currentMode === mode && cachedData[mode]) return;
        currentMode = mode;

        // Update Buttons UI
        document.querySelectorAll('.map-mode-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-mode-${mode}`);
        if (activeBtn) activeBtn.classList.add('active');

        await loadAndRender();
    }

    // Init function (Entry Point)
    async function init() {
        if (isInitialized) return;
        await loadAndRender();
        isInitialized = true;
    }

    // Core Load & Render Logic
    async function loadAndRender() {
        try {
            // Check Cache
            if (cachedData[currentMode]) {
                renderGeoJSONToSVG(cachedData[currentMode]);
                return;
            }

            console.log(`Loading Seoul Map Data (${currentMode}-level)...`);

            // Show Loading Text if switching
            const svg = document.getElementById('seoul-svg');
            if (svg && svg.querySelectorAll('path').length === 0) {
                // Only if empty, otherwise we might be switching fast
            }

            const response = await fetch(URLS[currentMode]);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const topoData = await response.json();

            // TopoJSON -> GeoJSON 변환
            if (!window.topojson) throw new Error("TopoJSON library not loaded");

            const objectName = Object.keys(topoData.objects)[0];
            const geoData = topojson.feature(topoData, topoData.objects[objectName]);

            cachedData[currentMode] = geoData;
            renderGeoJSONToSVG(geoData);

            console.log(`Seoul Map (${currentMode}) Rendered Successfully`);

            // 로딩 텍스트 제거
            const loadingText = document.getElementById('loading-text');
            if (loadingText) loadingText.remove();

        } catch (error) {
            console.error('Failed to load map data:', error);
            const loadingText = document.getElementById('loading-text');
            if (loadingText) {
                loadingText.textContent = "지도를 불러오는데 실패했습니다.";
                loadingText.style.fill = "#ff6b6b";
            }
        }
    }

    // [추가된 부분] 폴리곤의 중심 좌표 계산 함수
    function calculateCentroid(coordinates) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        // 다중 폴리곤 처리
        const flatten = (arr) => arr.flat(Infinity);
        // GeoJSON 좌표 구조에 따라 깊이가 다를 수 있음. 단순화하여 모든 좌표 추출
        const tempFlat = JSON.stringify(coordinates).replace(/\[/g, '').replace(/\]/g, '').split(',');

        let xSum = 0, ySum = 0, count = 0;

        for (let i = 0; i < tempFlat.length; i += 2) {
            const x = parseFloat(tempFlat[i]);
            const y = parseFloat(tempFlat[i + 1]);

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        return {
            lng: (minX + maxX) / 2,
            lat: (minY + maxY) / 2
        };
    }

    function renderGeoJSONToSVG(geojson) {
        if (!geojson) return;

        const svg = document.getElementById('seoul-svg');
        if (!svg) return;

        // Clear existing map elements (paths and markers)
        const paths = svg.querySelectorAll('.district-path');
        paths.forEach(p => p.remove());
        const markers = svg.querySelectorAll('.map-marker-group');
        markers.forEach(m => m.remove());

        // [추가] SVG 그라데이션 정의 추가 (한 번만 실행)
        if (!svg.querySelector('#markerGradients')) {
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            defs.id = 'markerGradients';

            // Quiet - 초록색 그라데이션
            const gradQuiet = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradQuiet.setAttribute("id", "gradientQuiet");
            gradQuiet.setAttribute("x1", "0%");
            gradQuiet.setAttribute("y1", "0%");
            gradQuiet.setAttribute("x2", "0%");
            gradQuiet.setAttribute("y2", "100%");
            gradQuiet.innerHTML = `
                <stop offset="0%" style="stop-color:#66bb6a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#43a047;stop-opacity:1" />
            `;
            defs.appendChild(gradQuiet);

            // Normal - 노란색 그라데이션
            const gradNormal = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradNormal.setAttribute("id", "gradientNormal");
            gradNormal.setAttribute("x1", "0%");
            gradNormal.setAttribute("y1", "0%");
            gradNormal.setAttribute("x2", "0%");
            gradNormal.setAttribute("y2", "100%");
            gradNormal.innerHTML = `
                <stop offset="0%" style="stop-color:#ffca28;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#ffa000;stop-opacity:1" />
            `;
            defs.appendChild(gradNormal);

            // Crowded - 주황/빨강 그라데이션
            const gradCrowded = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradCrowded.setAttribute("id", "gradientCrowded");
            gradCrowded.setAttribute("x1", "0%");
            gradCrowded.setAttribute("y1", "0%");
            gradCrowded.setAttribute("x2", "0%");
            gradCrowded.setAttribute("y2", "100%");
            gradCrowded.innerHTML = `
                <stop offset="0%" style="stop-color:#ff7043;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#e53935;stop-opacity:1" />
            `;
            defs.appendChild(gradCrowded);

            // Very Crowded - 진한 빨강 그라데이션
            const gradVeryCrowded = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradVeryCrowded.setAttribute("id", "gradientVeryCrowded");
            gradVeryCrowded.setAttribute("x1", "0%");
            gradVeryCrowded.setAttribute("y1", "0%");
            gradVeryCrowded.setAttribute("x2", "0%");
            gradVeryCrowded.setAttribute("y2", "100%");
            gradVeryCrowded.innerHTML = `
                <stop offset="0%" style="stop-color:#d32f2f;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#b71c1c;stop-opacity:1" />
            `;
            defs.appendChild(gradVeryCrowded);

            // Unknown - 회색 그라데이션
            const gradUnknown = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradUnknown.setAttribute("id", "gradientUnknown");
            gradUnknown.setAttribute("x1", "0%");
            gradUnknown.setAttribute("y1", "0%");
            gradUnknown.setAttribute("x2", "0%");
            gradUnknown.setAttribute("y2", "100%");
            gradUnknown.innerHTML = `
                <stop offset="0%" style="stop-color:#bdbdbd;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#757575;stop-opacity:1" />
            `;
            defs.appendChild(gradUnknown);

            svg.appendChild(defs);
        }

        // Calculate Bounds for Projection
        let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

        // 전체 좌표 순회하며 바운더리 계산
        geojson.features.forEach(feature => {
            // 중심점 계산을 위해 미리 바운더리 파악
            const centroid = calculateCentroid(feature.geometry.coordinates);
            feature.properties.centroid = centroid; // 계산된 중심점 저장

            if (centroid.lng < minLng) minLng = centroid.lng;
            if (centroid.lng > maxLng) maxLng = centroid.lng;
            if (centroid.lat < minLat) minLat = centroid.lat;
            if (centroid.lat > maxLat) maxLat = centroid.lat;
        });

        // Add padding (약간의 여백) - 서울 전체 범위 기준
        // minLng = 126.76; maxLng = 127.19;
        // minLat = 37.42; maxLat = 37.70;
        // 동적 바운더리 사용시
        const padding = 0.05;
        // minLng -= padding; maxLng += padding; ... 
        // 기존 하드코딩 유지
        minLng = 126.76; maxLng = 127.19;
        minLat = 37.42; maxLat = 37.70;

        // Use viewBox dimensions
        const width = 800;
        const height = 600;

        // Projection Function
        function project(lng, lat) {
            // [수정됨] 지도 크기 10% 축소 (scale 0.9)
            const scale = 0.9;
            const w = width - 40;
            const h = height - 40;
            const offsetX = 20 + (w * (1 - scale) / 2);
            const offsetY = 20 + (h * (1 - scale) / 2);

            const x = (lng - minLng) / (maxLng - minLng) * (w * scale) + offsetX;
            const y = height - ((lat - minLat) / (maxLat - minLat) * (h * scale)) - offsetY;
            return [x, y];
        }

        // Render Paths
        geojson.features.forEach(feature => {
            // [수정됨] 이름 속성 처리 (동: adm_nm, 구: SIG_KOR_NM 등)
            const name = feature.properties.name || feature.properties.adm_nm || feature.properties.SIG_KOR_NM || "Unknown";
            let pathData = "";

            const processPolygon = (ring) => {
                // Ring 좌표가 [lng, lat] 배열로 들어옴
                return "M" + ring.map(pt => {
                    const [x, y] = project(pt[0], pt[1]);
                    return `${x},${y}`;
                }).join(" ") + "Z";
            };

            // GeoJSON Geometry Type 처리
            if (feature.geometry.type === 'Polygon') {
                pathData = feature.geometry.coordinates.map(processPolygon).join(" ");
            } else if (feature.geometry.type === 'MultiPolygon') {
                pathData = feature.geometry.coordinates.map(poly => poly.map(processPolygon).join(" ")).join(" ");
            }

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("class", "district-path");
            path.setAttribute("data-name", name);

            // [변경된 부분] 훨씬 더 칙칙하고 어두운 계열의 색상 팔레트 (Darker & Duller)
            // [변경된 부분] 전체적으로 연하고(부드럽고) 어두운 계열 (Soft & Dark Muted)
            const congestionColors = [
                "#4b5c6b", // Soft Dark Blue
                "#4b6b55", // Soft Dark Green
                "#6b634b", // Soft Dark Yellow/Olive
                "#6b524b", // Soft Dark Orange/Brown
                "#6b4b4b"  // Soft Dark Red
            ];

            // 랜덤 색상 선택
            const randomColor = congestionColors[Math.floor(Math.random() * congestionColors.length)];

            // 스타일 조정: 동 단위는 작으므로 선 두께를 얇게
            path.style.strokeWidth = "0.5px";
            path.style.fill = randomColor; // 랜덤 색상 적용
            path.style.transition = "fill 0.3s ease, transform 0.3s ease"; // 부드러운 전환 효과

            // [수정됨] 호버 효과: 깜빡임/고정 버그 해결을 위해 mouseenter/mouseleave 사용 및 appendChild 제거
            path.onmouseenter = function () {
                this.style.fill = "#bdc3c7"; // Light Silver (어두운 배경 대비)
                this.style.zIndex = "100";
                // this.parentNode.appendChild(this); // [제거] DOM 재삽입 시 이벤트 끊김 현상 방지
            };
            path.onmouseleave = function () {
                this.style.fill = randomColor; // 원래 색상 복귀
                this.style.zIndex = "";
            };

            // Click Event: Switch to Naver Map
            path.onclick = () => {
                const centroid = feature.properties.centroid;
                if (centroid) {
                    showNaverMap(name, centroid.lat, centroid.lng);
                }
            };

            // Tooltip
            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = name;
            path.appendChild(title);

            svg.appendChild(path);
        });

        // [수정됨] Firebase에서 가져온 실제 장소 데이터로 마커 추가
        const addPlaceMarkers = async () => {
            try {
                // Firebase에서 장소 데이터 가져오기
                let places = [];
                if (typeof fetchPlacesFromFirestore === 'function') {
                    places = await fetchPlacesFromFirestore();
                    console.log(`Firebase에서 ${places.length}개의 장소 데이터를 가져왔습니다.`);
                } else {
                    console.warn('fetchPlacesFromFirestore 함수가 없습니다. firebase-config.js를 로드했는지 확인하세요.');
                    return;
                }

                if (places.length === 0) {
                    console.warn('표시할 장소 데이터가 없습니다.');
                    return;
                }

                // 좌표가 있는 장소만 필터링
                const validPlaces = places.filter(place => place.lat && place.lng);
                console.log(`${validPlaces.length}개의 유효한 좌표 데이터를 찾았습니다.`);

                validPlaces.forEach(place => {
                    // 좌표를 SVG 좌표로 변환
                    const [cx, cy] = project(place.lng, place.lat);

                    // 마커 컨테이너 그룹 (위치 지정)
                    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    g.setAttribute("class", "map-marker-group");
                    g.setAttribute("data-place-id", place.id);
                    g.setAttribute("data-place-name", place.name);
                    g.setAttribute("transform", `translate(${cx}, ${cy}) scale(0.7)`);

                    // 1. 그림자 (Shadow) - 바닥에 고정
                    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                    shadow.setAttribute("cx", "0");
                    shadow.setAttribute("cy", "0");
                    shadow.setAttribute("rx", "6");
                    shadow.setAttribute("ry", "2.5");
                    shadow.setAttribute("class", "map-pin-shadow");
                    g.appendChild(shadow);

                    // 2. 핀 그룹 (Pin Group) - 튀어오르는 애니메이션 적용 대상
                    const pinGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    pinGroup.setAttribute("class", "map-pin");

                    // 핀 모양 패스 (Teardrop shape)
                    const pinPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    const d = "M0,0 C-6,-8 -12,-15 -12,-22 A12,12 0 1,1 12,-22 C12,-15 6,-8 0,0 Z";
                    pinPath.setAttribute("d", d);

                    // 혼잡도에 따른 색상 적용
                    const congestionColor = typeof getCongestionColor === 'function'
                        ? getCongestionColor(place.congestion)
                        : '#9E9E9E'; // 기본 회색
                    pinPath.setAttribute("fill", congestionColor);
                    pinPath.setAttribute("stroke", "#333");
                    pinPath.setAttribute("stroke-width", "0.5");
                    pinGroup.appendChild(pinPath);

                    // 핀 내부 구멍 (White Hole)
                    const pinHole = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    pinHole.setAttribute("cx", "0");
                    pinHole.setAttribute("cy", "-22");
                    pinHole.setAttribute("r", "4.5");
                    pinHole.setAttribute("fill", "white");
                    pinGroup.appendChild(pinHole);

                    // 마커 클릭 이벤트 - 장소 상세 정보 표시
                    g.style.cursor = "pointer";
                    g.onclick = () => {
                        console.log(`장소 클릭: ${place.name} (혼잡도: ${place.congestion})`);
                        // 상세 정보 모달 표시 (detail.html에 있는 기능 사용)
                        if (typeof showPlaceDetail === 'function') {
                            showPlaceDetail(place);
                        } else {
                            // 간단한 알림으로 대체
                            const congestionText = typeof getCongestionText === 'function'
                                ? getCongestionText(place.congestion)
                                : place.congestion;
                            alert(`${place.name}\n주소: ${place.address}\n혼잡도: ${congestionText}\n\n${place.congestionMsg || ''}`);
                        }
                    };

                    // 마커 호버 효과
                    g.onmouseenter = function () {
                        this.style.transform = `translate(${cx}px, ${cy}px) scale(0.85)`;
                        this.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.3))";
                    };
                    g.onmouseleave = function () {
                        this.style.transform = `translate(${cx}px, ${cy}px) scale(0.7)`;
                        this.style.filter = "";
                    };

                    // 툴팁 (SVG title 요소)
                    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                    const congestionText = typeof getCongestionText === 'function'
                        ? getCongestionText(place.congestion)
                        : place.congestion;
                    title.textContent = `${place.name}\n혼잡도: ${congestionText}`;
                    g.appendChild(title);

                    g.appendChild(pinGroup);
                    svg.appendChild(g);
                });

                console.log(`${validPlaces.length}개의 장소 마커가 지도에 추가되었습니다.`);
            } catch (error) {
                console.error('장소 마커 추가 중 오류 발생:', error);
            }
        };

        // 비동기 함수 실행
        addPlaceMarkers();
    }

    function showNaverMap(name, lat, lng) {
        const seoulWrapper = document.getElementById('seoul-map-wrapper');
        const naverWrapper = document.getElementById('naver-map-wrapper');

        // Visual Transition
        seoulWrapper.classList.add('hidden');
        naverWrapper.classList.add('active');

        // Initialize Naver Map
        if (!naverMap) {
            naverMap = new naver.maps.Map('naver-map', {
                center: new naver.maps.LatLng(lat, lng),
                zoom: 16, // 동 단위이므로 줌 레벨 확대
                mapTypeId: naver.maps.MapTypeId.NORMAL
            });
        } else {
            const newCenter = new naver.maps.LatLng(lat, lng);
            naverMap.setCenter(newCenter);
            naverMap.setZoom(16);
        }

        console.log(`Switched to Naver Map: ${name} (${lat}, ${lng})`);
    }

    function backToSeoul() {
        const seoulWrapper = document.getElementById('seoul-map-wrapper');
        const naverWrapper = document.getElementById('naver-map-wrapper');

        naverWrapper.classList.remove('active');
        seoulWrapper.classList.remove('hidden');

        // 지도 상태 유지를 위해 별도 리렌더링 불필요
    }

    return {
        init,
        setMode,
        backToSeoul
    };
})();
