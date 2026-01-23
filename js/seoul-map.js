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
        // Note: We might want to keep the loading text if it's there, but usually it's managed by loadAndRender
        const paths = svg.querySelectorAll('.district-path');
        paths.forEach(p => p.remove());
        const markers = svg.querySelectorAll('.map-marker-group');
        markers.forEach(m => m.remove());

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
            const x = (lng - minLng) / (maxLng - minLng) * (width - 40) + 20; // 20px padding
            const y = height - ((lat - minLat) / (maxLat - minLat) * (height - 40)) - 20;
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

        // [추가된 부분] 지도 위에 20개의 랜덤 마커 추가
        const addRandomMarkers = () => {
            // 랜덤하게 20개 지역 선택 (Fisher-Yates Shuffle or simple sort)
            const shuffled = [...geojson.features].sort(() => 0.5 - Math.random());
            const selectedFeatures = shuffled.slice(0, 20);

            selectedFeatures.forEach(feature => {
                const centroid = feature.properties.centroid;
                if (!centroid) return;

                // project 함수는 상위 스코프(renderGeoJSONToSVG) 내에 있음
                const [cx, cy] = project(centroid.lng, centroid.lat);

                // 마커 컨테이너 그룹 (위치 지정)
                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("class", "map-marker-group");
                // [수정됨] 크기 30% 축소 (scale 0.7)
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
                pinGroup.setAttribute("class", "map-pin"); // CSS에서 animation 적용

                // 핀 모양 패스 (Teardrop shape)
                const pinPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const d = "M0,0 C-6,-8 -12,-15 -12,-22 A12,12 0 1,1 12,-22 C12,-15 6,-8 0,0 Z";
                pinPath.setAttribute("d", d);
                pinGroup.appendChild(pinPath);

                // 핀 내부 구멍 (White Hole)
                const pinHole = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                pinHole.setAttribute("cx", "0");
                pinHole.setAttribute("cy", "-22");
                pinHole.setAttribute("r", "4.5");
                pinHole.setAttribute("fill", "white");
                pinGroup.appendChild(pinHole);

                g.appendChild(pinGroup);
                svg.appendChild(g);
            });
        };
        addRandomMarkers();
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
