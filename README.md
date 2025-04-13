# 한국고고학사전 데스크톱 애플리케이션

문화재청 매장문화재 포털에서 제공하는 한국고고학사전 데이터를 다운로드하고 로컬에서 검색하여 활용할 수 있는 네이티브 데스크톱 애플리케이션입니다.

![애플리케이션 미리보기](./docs/images/preview.png)

## 특징

- 문화재청 Open API를 사용하여 한국고고학사전 데이터 수집
- 오프라인 사용을 위한 로컬 데이터베이스 지원
- 빠른 전문 검색 및 필터링 기능
- 용어 및 유적 정보를 카테고리별로 브라우징
- 북마크 및 노트 기능으로 개인화된 학습 지원
- 이미지 갤러리 및 확대/축소 기능

## 설치 방법

### Windows

1. [최신 릴리스](https://github.com/kyi000/archaeology-dictionary/releases)에서 `ArchaeologyDictionary-Setup-x.x.x.exe` 파일을 다운로드합니다.
2. 다운로드한 설치 프로그램을 실행하고 설치 안내를 따릅니다.
3. 설치가 완료되면 시작 메뉴 또는 바탕화면 바로가기를 통해 애플리케이션을 실행할 수 있습니다.

### macOS

1. [최신 릴리스](https://github.com/kyi000/archaeology-dictionary/releases)에서 `ArchaeologyDictionary-x.x.x.dmg` 파일을 다운로드합니다.
2. DMG 파일을 열고 애플리케이션을 응용 프로그램 폴더로 드래그합니다.
3. 응용 프로그램 폴더에서 애플리케이션을 실행합니다.

### Linux

1. [최신 릴리스](https://github.com/kyi000/archaeology-dictionary/releases)에서 운영체제에 맞는 패키지를 다운로드합니다:
   - Debian/Ubuntu: `archaeology-dictionary_x.x.x_amd64.deb`
   - Red Hat/Fedora: `archaeology-dictionary-x.x.x.rpm`
   - 기타 Linux: `ArchaeologyDictionary-x.x.x.AppImage`
2. 패키지 관리자를 통해 설치하거나 AppImage를 실행합니다.

## 개발자를 위한 정보

### 개발 환경 설정 (WSL Ubuntu 24.04)

1. 저장소 클론:
   ```bash
   git clone https://github.com/kyi000/archaeology-dictionary.git
   cd archaeology-dictionary
   ```

2. 의존성 설치:
   ```bash
   npm install
   ```

3. 개발 모드로 실행:
   ```bash
   npm start
   ```

4. 빌드:
   ```bash
   npm run build
   ```

5. 패키지 생성:
   ```bash
   npm run package
   ```

## 라이센스

이 애플리케이션은 MIT 라이센스 하에 배포됩니다.

## 데이터 출처

이 애플리케이션에서 사용하는 한국고고학사전 데이터는 국립문화유산연구원에서 제공하는 공공 데이터를 활용합니다. 공공누리 제1유형(출처표시)에 따라 이용합니다.

- 데이터 출처: 국립문화유산연구원
- Open API 주소: http://portal.nrich.go.kr/kor/openapi.do?idx=39