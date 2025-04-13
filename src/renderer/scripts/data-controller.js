/**
 * 데이터 컨트롤러
 * 
 * 데이터 관리와 IPC 통신을 담당합니다.
 */

const DataController = {
  /**
   * 데이터 상태 확인
   */
  async checkDataStatus() {
    try {
      // 기본 검색으로 데이터 존재 여부 확인
      window.archaeology.search('', {
        limit: 1
      });
      
      // 카테고리 정보 로드
      window.archaeology.getCategories();
      
      // 북마크 항목 로드
      window.archaeology.on('search-results', (results) => {
        if (results && Array.isArray(results)) {
          UIController.displayDataStatus(true, `데이터 준비 완료: ${results.length > 0 ? '항목 있음' : '항목 없음'}`);
          
          // 총 항목 수 가져오기
          this.getTotalItemsCount();
          
          // 북마크 항목 로드
          this.loadBookmarkedItems();
          
          // 최근 조회 항목 로드
          this.loadRecentItems();
        } else {
          UIController.displayDataStatus(false, '데이터를 로드할 수 없습니다. 업데이트가 필요합니다.');
        }
      });
      
      // 검색 오류 처리
      window.archaeology.on('search-error', () => {
        UIController.displayDataStatus(false, '데이터를 로드할 수 없습니다. 업데이트가 필요합니다.');
      });
    } catch (error) {
      console.error('데이터 상태 확인 오류:', error);
      UIController.displayDataStatus(false, '데이터 상태 확인 중 오류가 발생했습니다.');
    }
  },
  
  /**
   * 총 항목 수 가져오기
   */
  async getTotalItemsCount() {
    try {
      // 검색 결과의 개수 활용
      window.archaeology.search('', {
        limit: 0
      });
      
      window.archaeology.on('search-results', (results) => {
        if (results && Array.isArray(results)) {
          UIController.displayTotalItemsCount(results.length);
        }
      });
    } catch (error) {
      console.error('총 항목 수 가져오기 오류:', error);
    }
  },
  
  /**
   * 데이터 업데이트
   */
  async updateData() {
    try {
      window.archaeology.updateData();
    } catch (error) {
      console.error('데이터 업데이트 오류:', error);
      UIController.showError('데이터 업데이트 요청 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 데이터 초기화
   */
  async resetData() {
    try {
      const confirmed = UIController.showMessage(
        '정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없으며, 개인 노트와 북마크를 포함한 모든 데이터가 삭제됩니다.',
        true
      );
      
      if (confirmed) {
        window.archaeology.resetDatabase();
      }
    } catch (error) {
      console.error('데이터 초기화 오류:', error);
      UIController.showError('데이터 초기화 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 데이터 내보내기
   */
  async exportData() {
    try {
      // 데이터 내보내기는 메인 프로세스에서 처리
      UIController.showMessage('데이터 내보내기가 요청되었습니다. 파일 저장 대화상자가 나타납니다.');
    } catch (error) {
      console.error('데이터 내보내기 오류:', error);
      UIController.showError('데이터 내보내기 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 검색 실행
   * @param {string} query - 검색어
   * @param {Object} options - 검색 옵션
   */
  async search(query, options = {}) {
    try {
      const filters = {
        ...options,
        categoryId: AppState.selectedCategoryId,
        type: AppState.selectedTypeFilter,
        limit: AppState.itemsPerPage,
        offset: (AppState.currentPage - 1) * AppState.itemsPerPage
      };
      
      // 검색어가 비어있는 경우 기본 검색
      if (!query || query.trim() === '') {
        this.loadItemsPage();
        return;
      }
      
      // 검색 상태 업데이트
      AppState.searchQuery = query;
      AppState.currentPage = 1;
      
      // 검색 요청
      window.archaeology.search(query, filters);
    } catch (error) {
      console.error('검색 오류:', error);
      UIController.showError('검색 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 항목 페이지 로드
   */
  async loadItemsPage() {
    try {
      const filters = {
        categoryId: AppState.selectedCategoryId,
        type: AppState.selectedTypeFilter,
        limit: AppState.itemsPerPage,
        offset: (AppState.currentPage - 1) * AppState.itemsPerPage
      };
      
      // 정렬 옵션 적용
      switch (AppState.sortOption) {
        case 'recent':
          filters.sort = 'last_viewed';
          filters.sortDir = 'desc';
          break;
        case 'count':
          filters.sort = 'view_count';
          filters.sortDir = 'desc';
          break;
        case 'name':
        default:
          filters.sort = 'name';
          filters.sortDir = 'asc';
          break;
      }
      
      // 검색어가 있는 경우
      if (AppState.searchQuery) {
        window.archaeology.search(AppState.searchQuery, filters);
        return;
      }
      
      // 검색어가 없는 경우 (전체 목록)
      window.archaeology.search('', filters);
    } catch (error) {
      console.error('항목 페이지 로드 오류:', error);
      UIController.showError('항목 페이지 로드 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 항목 상세 정보 조회
   * @param {string} itemId - 항목 ID
   */
  async viewItemDetail(itemId) {
    try {
      window.archaeology.getItemDetail(itemId);
    } catch (error) {
      console.error('항목 상세 정보 조회 오류:', error);
      UIController.showError('항목 상세 정보 조회 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 북마크 토글
   * @param {string} itemId - 항목 ID
   * @param {boolean} isBookmarked - 북마크 상태
   */
  async toggleBookmark(itemId, isBookmarked) {
    try {
      window.archaeology.toggleBookmark(itemId, isBookmarked);
    } catch (error) {
      console.error('북마크 토글 오류:', error);
      UIController.showError('북마크 상태 변경 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 노트 저장
   * @param {string} itemId - 항목 ID
   */
  async saveNote(itemId) {
    try {
      const noteTextarea = document.getElementById('itemNote');
      if (!noteTextarea) {
        throw new Error('노트 텍스트 영역을 찾을 수 없습니다.');
      }
      
      const noteText = noteTextarea.value.trim();
      window.archaeology.saveNote(itemId, noteText);
    } catch (error) {
      console.error('노트 저장 오류:', error);
      UIController.showError('노트 저장 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 카테고리별 항목 로드
   * @param {string} categoryId - 카테고리 ID
   */
  async loadCategoryItems(categoryId) {
    try {
      // 카테고리 상태 업데이트
      AppState.selectedCategoryId = categoryId;
      AppState.currentPage = 1;
      AppState.searchQuery = '';
      
      // 카테고리 링크 활성화 상태 업데이트
      const categoryLinks = document.querySelectorAll('#dictionaryTypeList a');
      categoryLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.categoryId === categoryId) {
          link.classList.add('active');
        }
      });
      
      // 필터 선택 업데이트
      const categoryFilter = document.getElementById('categoryFilter');
      if (categoryFilter) {
        categoryFilter.value = categoryId;
      }
      
      // 항목 로드
      window.archaeology.getCategoryItems(categoryId);
    } catch (error) {
      console.error('카테고리별 항목 로드 오류:', error);
      UIController.showError('카테고리별 항목 로드 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 북마크된 항목 로드
   */
  async loadBookmarkedItems() {
    try {
      window.archaeology.getBookmarkedItems();
    } catch (error) {
      console.error('북마크된 항목 로드 오류:', error);
      UIController.showError('북마크된 항목 로드 중 오류가 발생했습니다.', error.message);
    }
  },
  
  /**
   * 최근 조회 항목 로드
   */
  async loadRecentItems() {
    try {
      window.archaeology.getRecentItems();
    } catch (error) {
      console.error('최근 조회 항목 로드 오류:', error);
      UIController.showError('최근 조회 항목 로드 중 오류가 발생했습니다.', error.message);
    }
  }
};
