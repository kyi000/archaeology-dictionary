#!/bin/bash

# 한국고고학사전 애플리케이션 설치 스크립트
# WSL Ubuntu 24.04 환경에서 실행하세요.

echo "한국고고학사전 애플리케이션 설치를 시작합니다..."

# 필요한 도구 설치 확인
echo "필요한 도구를 확인하고 설치합니다..."

# Node.js 버전 확인 및 설치
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 14 ]]; then
    echo "Node.js 14 이상이 필요합니다. Node.js를 설치합니다..."
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js가 이미 설치되어 있습니다: $(node -v)"
fi

# npm 확인
if ! command -v npm &> /dev/null; then
    echo "npm을 설치합니다..."
    sudo apt-get install -y npm
else
    echo "npm이 이미 설치되어 있습니다: $(npm -v)"
fi

# 빌드 도구 설치
echo "빌드 도구를 설치합니다..."
sudo apt-get update
sudo apt-get install -y build-essential git

# Electron 빌드 의존성 설치
echo "Electron 빌드 의존성을 설치합니다..."
sudo apt-get install -y libgconf-2-4 libgtk-3-0 libnss3 libxss1 libasound2

# 패키지 설치
echo "패키지를 설치합니다..."
npm install

# 애플리케이션 빌드
echo "애플리케이션을 빌드합니다..."
npm run build

echo "한국고고학사전 애플리케이션 설치가 완료되었습니다."
echo "다음 명령어로 애플리케이션을 실행할 수 있습니다:"
echo "npm start"
