/**
 * 한국고고학사전 애플리케이션 메인 스크립트
 * 
 * 이 파일은 애플리케이션의 진입점으로, 다른 컨트롤러들을 초기화하고
 * 이벤트 리스너와 전역 기능을 설정합니다.
 */

// 애플리케이션 상태
const AppState = {
  theme: 'light',
  fontSize: 'medium',
  currentView: 'home',
  searchQuery: '',
  currentPage: 1,
  itemsPerPage: 20,
  selectedCategoryId: null,
  selectedTypeFilter: '',
  sortOption: 'name',
  isDataLoaded: false,
  totalItems: 0,
  bookmarkedItems: [],
  recentItems: [],
  
  // 상태 초기화
  initialize() {
    // 로컬 스토리지에서 설정 로드
    this.loadSettings();
    
    // 테마 적용
    document.body.setAttribute('data-theme', this.theme);
    
    // 글꼴 크기 적용
    document.body.setAttribute('data-font-size', this.fontSize);
    
    // 버전 정보 표시
    const versionInfo = document.getElementById('versionInfo');
    if (versionInfo) {
      versionInfo.textContent = `버전 ${window.appInfo.version || '1.0.0'}`;
    }
    
    // 페이지 뷰 초기화
    this.setCurrentView(this.currentView);
    
    // 카테고리 선택 초기화
    if (this.selectedCategoryId) {
      const categoryLinks = document.querySelectorAll('#dictionaryTypeList a');
      categoryLinks.forEach(link => {
        if (link.dataset.categoryId === this.selectedCategoryId) {
          link.classList.add('active');
        }
      });
    }
    
    // 설정 UI 업데이트
    this.updateSettingsUI();
  },
  
  // 로컬 스토리지에서 설정 로드
  loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('archaeology-settings'));
      if (settings) {
        this.theme = settings.theme || 'light';
        this.fontSize = settings.fontSize || 'medium';
        this.currentView = settings.currentView || 'home';
        this.itemsPerPage = settings.itemsPerPage || 20;
      }
    } catch (error) {
      console.error('설정 로드 오류:', error);
    }
  },
  
  // 설정 저장
  saveSettings() {
    try {
      const settings = {
        theme: this.theme,
        fontSize: this.fontSize,
        currentView: this.currentView,
        itemsPerPage: this.itemsPerPage
      };
      localStorage.setItem('archaeology-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('설정 저장 오류:', error);
    }
  },
  
  // 현재 뷰 설정
  setCurrentView(viewName) {
    // 이전 활성 뷰 비활성화
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));
    
    // 이전 활성 네비게이션 항목 비활성화
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // 새 뷰 활성화
    const newView = document.getElementById(`${viewName}View`);
    if (newView) {
      newView.classList.add('active');
    }
    
    // 새 네비게이션 항목 활성화
    const newNavItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (newNavItem) {
      newNavItem.classList.add('active');
    }
    
    // 상태 업데이트
    this.currentView = viewName;
    this.saveSettings();
  },
  
  // 설정 UI 업데이트
  updateSettingsUI() {
    // 테마 선택 업데이트
    const themeOption = document.getElementById('themeOption');
    if (themeOption) {
      themeOption.value = this.theme;
    }
    
    // 글꼴 크기 선택 업데이트
    const fontSizeOption = document.getElementById('fontSizeOption');
    if (fontSizeOption) {
      fontSizeOption.value = this.fontSize;
    }
  },
  
  // 테마 변경
  setTheme(themeName) {
    this.theme = themeName;
    document.body.setAttribute('data-theme', themeName);
    this.saveSettings();
  },
  
  // 글꼴 크기 변경
  setFontSize(size) {
    this.fontSize = size;
    document.body.setAttribute('data-font-size', size);
    this.saveSettings();
  }
};

// 메인 UI 초기화 함수
function initializeUI() {
  // 네비게이션 이벤트 리스너 추가
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      const viewName = item.dataset.view;
      AppState.setCurrentView(viewName);
    });
  });
  
  // 검색 이벤트 리스너 추가
  const searchForm = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  
  if (searchForm && searchButton) {
    searchButton.addEventListener('click', () => {
      const query = searchForm.value.trim();
      if (query) {
        DataController.search(query);
      }
    });
    
    searchForm.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const query = searchForm.value.trim();
        if (query) {
          DataController.search(query);
        }
      }
    });
  }
  
  // 데이터 업데이트 버튼 이벤트 리스너
  const updateButtons = [
    document.getElementById('updateDataButton'),
    document.getElementById('settingsUpdateButton')
  ];
  
  updateButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', () => {
        UIController.showUpdateProgressModal();
        DataController.updateData();
      });
    }
  });
  
  // 데이터 초기화 버튼 이벤트 리스너
  const resetDataButton = document.getElementById('resetDataButton');
  if (resetDataButton) {
    resetDataButton.addEventListener('click', () => {
      if (confirm('정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        DataController.resetData();
      }
    });
  }
  
  // 데이터 내보내기 버튼 이벤트 리스너
  const exportDataButton = document.getElementById('exportDataButton');
  if (exportDataButton) {
    exportDataButton.addEventListener('click', () => {
      DataController.exportData();
    });
  }
  
  // 테마 선택 이벤트 리스너
  const themeOption = document.getElementById('themeOption');
  if (themeOption) {
    themeOption.addEventListener('change', () => {
      AppState.setTheme(themeOption.value);
    });
  }
  
  // 글꼴 크기 선택 이벤트 리스너
  const fontSizeOption = document.getElementById('fontSizeOption');
  if (fontSizeOption) {
    fontSizeOption.addEventListener('change', () => {
      AppState.setFontSize(fontSizeOption.value);
    });
  }
  
  // 업데이트 확인 버튼 이벤트 리스너
  const checkUpdateButton = document.getElementById('checkUpdateButton');
  if (checkUpdateButton) {
    checkUpdateButton.addEventListener('click', () => {
      alert('업데이트 확인 중입니다...');
      // 업데이트 확인 코드는 main 프로세스에서 처리
    });
  }
  
  // 라이선스 보기 버튼 이벤트 리스너
  const licensesButton = document.getElementById('licensesButton');
  if (licensesButton) {
    licensesButton.addEventListener('click', () => {
      alert('오픈소스 라이선스 정보는 준비 중입니다.');
    });
  }
  
  // 상세 정보 모달 닫기 버튼 이벤트 리스너
  const closeButtons = document.querySelectorAll('.close-button');
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      UIController.closeModals();
    });
  });
  
  // 페이지 탐색 버튼 이벤트 리스너
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (AppState.currentPage > 1) {
        AppState.currentPage--;
        DataController.loadItemsPage();
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      AppState.currentPage++;
      DataController.loadItemsPage();
    });
  }
  
  // 정렬 옵션 변경 이벤트 리스너
  const sortOption = document.getElementById('sortOption');
  if (sortOption) {
    sortOption.addEventListener('change', () => {
      AppState.sortOption = sortOption.value;
      AppState.currentPage = 1;
      DataController.loadItemsPage();
    });
  }
  
  // 필터 변경 이벤트 리스너
  const typeFilter = document.getElementById('typeFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  
  if (typeFilter) {
    typeFilter.addEventListener('change', () => {
      AppState.selectedTypeFilter = typeFilter.value;
      AppState.currentPage = 1;
      DataController.loadItemsPage();
    });
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      AppState.selectedCategoryId = categoryFilter.value;
      AppState.currentPage = 1;
      DataController.loadItemsPage();
    });
  }
  
  // 윈도우 클릭 이벤트 리스너 (모달 닫기용)
  window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (event.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

// DOM 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('애플리케이션 초기화 중...');
  
  // 애플리케이션 상태 초기화
  AppState.initialize();
  
  // UI 초기화
  initializeUI();
  
  // 데이터 상태 확인
  DataController.checkDataStatus();
  
  // IPC 이벤트 리스너 등록
  setupIPCListeners();
  
  console.log('애플리케이션 초기화 완료');
});

// IPC 이벤트 리스너 설정
function setupIPCListeners() {
  // 데이터베이스 준비 완료
  window.archaeology.on('database-ready', () => {
    console.log('데이터베이스 준비 완료');
    DataController.checkDataStatus();
  });
  
  // 검색 결과
  window.archaeology.on('search-results', (results) => {
    UIController.displaySearchResults(results);
  });
  
  // 검색 오류
  window.archaeology.on('search-error', (error) => {
    UIController.showError('검색 중 오류가 발생했습니다.', error);
  });
  
  // 항목 상세 정보
  window.archaeology.on('item-detail', (item) => {
    UIController.displayItemDetail(item);
  });
  
  // 항목 상세 정보 오류
  window.archaeology.on('item-detail-error', (error) => {
    UIController.showError('항목 정보를 불러오는 중 오류가 발생했습니다.', error);
  });
  
  // 업데이트 시작
  window.archaeology.on('update-started', () => {
    UIController.showUpdateProgressModal();
    UIController.updateProgress(0, '업데이트 준비 중...');
  });
  
  // 업데이트 진행 상황
  window.archaeology.on('update-progress', (progress) => {
    UIController.updateProgress(progress.progress, progress.message);
  });
  
  // 업데이트 완료
  window.archaeology.on('update-completed', (result) => {
    UIController.closeModals();
    UIController.showMessage(`업데이트 완료: ${result.count}개 항목이 업데이트되었습니다.`);
    DataController.checkDataStatus();
  });
  
  // 업데이트 오류
  window.archaeology.on('update-error', (error) => {
    UIController.closeModals();
    UIController.showError('업데이트 중 오류가 발생했습니다.', error);
  });
  
  // 북마크 업데이트 완료
  window.archaeology.on('bookmark-updated', (result) => {
    UIController.updateBookmarkButton(result.itemId, result.isBookmarked);
  });
  
  // 북마크 오류
  window.archaeology.on('bookmark-error', (error) => {
    UIController.showError('북마크 업데이트 중 오류가 발생했습니다.', error);
  });
  
  // 노트 저장 완료
  window.archaeology.on('note-saved', () => {
    UIController.showMessage('노트가 저장되었습니다.');
  });
  
  // 노트 저장 오류
  window.archaeology.on('note-error', (error) => {
    UIController.showError('노트 저장 중 오류가 발생했습니다.', error);
  });
  
  // 카테고리 목록
  window.archaeology.on('categories-list', (categories) => {
    UIController.displayCategories(categories);
  });
  
  // 카테고리별 항목 목록
  window.archaeology.on('category-items', (items) => {
    UIController.displayCategoryItems(items);
  });
  
  // 북마크 항목 목록
  window.archaeology.on('bookmarked-items', (items) => {
    UIController.displayBookmarkedItems(items);
    AppState.bookmarkedItems = items;
  });
  
  // 최근 조회 항목 목록
  window.archaeology.on('recent-items', (items) => {
    UIController.displayRecentItems(items);
    AppState.recentItems = items;
  });
  
  // 데이터 초기화 완료
  window.archaeology.on('data-reset-complete', () => {
    UIController.showMessage('모든 데이터가 초기화되었습니다.');
    DataController.checkDataStatus();
  });
  
  // 업데이트 대화상자 표시
  window.archaeology.on('show-update-dialog', () => {
    if (confirm('새 데이터를 다운로드하시겠습니까?')) {
      UIController.showUpdateProgressModal();
      DataController.updateData();
    }
  });
  
  // 설정 화면 표시
  window.archaeology.on('show-settings', () => {
    AppState.setCurrentView('settings');
  });
  
  // 업데이트 가능 알림
  window.archaeology.on('update-available', () => {
    UIController.showMessage('새 버전의 애플리케이션이 있습니다. 업데이트를 진행하시겠습니까?', true);
  });
}