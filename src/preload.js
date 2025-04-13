const { contextBridge, ipcRenderer } = require('electron');

// 메인 프로세스와 렌더러 프로세스 간의 안전한 통신을 위한 API 노출
contextBridge.exposeInMainWorld('archaeology', {
  // 검색 기능
  search: (query, filters) => {
    ipcRenderer.send('search-items', query, filters);
  },
  
  // 상세 정보 조회
  getItemDetail: (itemId) => {
    ipcRenderer.send('get-item-detail', itemId);
  },
  
  // 데이터 업데이트
  updateData: () => {
    ipcRenderer.send('update-data');
  },
  
  // 북마크 토글
  toggleBookmark: (itemId, isBookmarked) => {
    ipcRenderer.send('toggle-bookmark', itemId, isBookmarked);
  },
  
  // 노트 저장
  saveNote: (itemId, noteText) => {
    ipcRenderer.send('save-note', itemId, noteText);
  },
  
  // 카테고리 목록 조회
  getCategories: () => {
    ipcRenderer.send('get-categories');
  },
  
  // 카테고리별 항목 조회
  getCategoryItems: (categoryId) => {
    ipcRenderer.send('get-category-items', categoryId);
  },
  
  // 북마크 항목 조회
  getBookmarkedItems: () => {
    ipcRenderer.send('get-bookmarked-items');
  },
  
  // 최근 조회 항목 조회
  getRecentItems: () => {
    ipcRenderer.send('get-recent-items');
  },
  
  // 이벤트 리스너
  on: (channel, callback) => {
    // 허용된 채널 목록
    const validChannels = [
      'search-results',
      'search-error',
      'item-detail',
      'item-detail-error',
      'update-started',
      'update-progress',
      'update-completed',
      'update-error',
      'bookmark-updated',
      'bookmark-error',
      'note-saved',
      'note-error',
      'categories-list',
      'category-items',
      'bookmarked-items',
      'recent-items',
      'database-ready',
      'show-update-dialog',
      'show-settings',
      'data-reset-complete',
      'update-available'
    ];
    
    if (validChannels.includes(channel)) {
      // 원래 이벤트 리스너 제거 (중복 방지)
      ipcRenderer.removeAllListeners(channel);
      
      // 새 이벤트 리스너 등록
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  
  // 이벤트 리스너 제거
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// 버전 정보 추가
contextBridge.exposeInMainWorld('appInfo', {
  version: process.env.npm_package_version || '1.0.0'
});

// DOMContentLoaded 이벤트 리스너 추가
window.addEventListener('DOMContentLoaded', () => {
  // DOM이 로드된 후 초기화 코드
  console.log('DOM 로드 완료');
});