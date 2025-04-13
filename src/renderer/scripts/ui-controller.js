/**
 * UI 컨트롤러
 * 
 * 사용자 인터페이스의 업데이트와 조작을 담당합니다.
 */

const UIController = {
  /**
   * 검색 결과 표시
   * @param {Array} results - 검색 결과 항목 배열
   */
  displaySearchResults(results) {
    // 사전 뷰로 이동
    AppState.setCurrentView('dictionary');
    
    // 결과 표시 영역 가져오기
    const itemsList = document.getElementById('itemsList');
    if (!itemsList) return;
    
    // 결과가 없는 경우
    if (!results || results.length === 0) {
      itemsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <p class="empty-state-message">검색 결과가 없습니다.</p>
        </div>
      `;
      return;
    }
    
    // 결과 HTML 생성
    let html = '';
    results.forEach(item => {
      // 검색 결과 하이라이팅 적용
      const title = item.name_highlight || item.name;
      const excerpt = item.content_highlight || this.truncateText(item.content, 150);
      
      html += `
        <div class="item" data-id="${item.id}">
          <h3 class="item-title">
            <a href="#" onclick="DataController.viewItemDetail('${item.id}'); return false;">${title}</a>
          </h3>
          <div class="item-meta">
            ${item.type_name || ''} · ${item.dictionary_type === '1' ? '유적' : '용어'}
            ${item.view_count ? ` · 조회 ${item.view_count}회` : ''}
          </div>
          <div class="item-excerpt">${excerpt}</div>
          <div class="item-actions">
            <button onclick="DataController.toggleBookmark('${item.id}', ${!item.is_bookmarked})">
              ${item.is_bookmarked ? '★ 북마크 해제' : '☆ 북마크'}
            </button>
          </div>
        </div>
      `;
    });
    
    // HTML 업데이트
    itemsList.innerHTML = html;
    
    // 페이지 정보 업데이트
    this.updatePagination(results.length);
  },
  
  /**
   * 항목 상세 정보 표시
   * @param {Object} item - 항목 상세 정보
   */
  displayItemDetail(item) {
    // 모달 요소 가져오기
    const modal = document.getElementById('itemDetailModal');
    const content = document.getElementById('itemDetailContent');
    
    if (!modal || !content) return;
    
    // HTML 생성
    let html = `
      <div class="item-detail-header">
        <h2>${item.name}</h2>
        <div class="item-meta">
          <span>${item.type_name || '한국고고학사전'}</span>
          <span>${item.dictionary_type === '1' ? '유적' : '용어'}</span>
          ${item.view_count ? `<span>조회 ${item.view_count}회</span>` : ''}
        </div>
      </div>
      
      <div class="item-detail-content">
        ${this.formatContent(item.content)}
      </div>
    `;
    
    // 참고문헌이 있는 경우
    if (item.reference) {
      html += `
        <div class="item-detail-references">
          <h3>참고문헌</h3>
          <div>${this.formatContent(item.reference)}</div>
        </div>
      `;
    }
    
    // 도구 버튼 추가
    html += `
      <div class="item-detail-tools">
        <button id="bookmarkButton" class="secondary-button" onclick="DataController.toggleBookmark('${item.id}', ${!item.is_bookmarked})">
          ${item.is_bookmarked ? '★ 북마크 해제' : '☆ 북마크'}
        </button>
        
        <a href="${item.data_link || '#'}" target="_blank" class="secondary-button" ${!item.data_link ? 'disabled' : ''}>
          원문 링크
        </a>
      </div>
    `;
    
    // 노트 영역 추가
    html += `
      <div class="item-notes">
        <h3>개인 노트</h3>
        <textarea id="itemNote" placeholder="이 항목에 대한 개인 노트를 입력하세요...">${item.note || ''}</textarea>
        <button class="primary-button" onclick="DataController.saveNote('${item.id}')">저장</button>
      </div>
    `;
    
    // 모달 내용 업데이트
    content.innerHTML = html;
    
    // 모달 표시
    modal.classList.add('active');
  },
  
  /**
   * 카테고리 목록 표시
   * @param {Array} categories - 카테고리 목록
   */
  displayCategories(categories) {
    // 카테고리 그리드 요소 가져오기
    const categoriesGrid = document.getElementById('categoriesGrid');
    const categoryList = document.getElementById('dictionaryTypeList');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (!categories || categories.length === 0) {
      if (categoriesGrid) {
        categoriesGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <p class="empty-state-message">카테고리 정보가 없습니다.</p>
          </div>
        `;
      }
      
      if (categoryList) {
        categoryList.innerHTML = `<li>카테고리 정보가 없습니다.</li>`;
      }
      
      return;
    }
    
    // 카테고리 그리드 업데이트
    if (categoriesGrid) {
      let gridHtml = '';
      categories.forEach(category => {
        gridHtml += `
          <div class="category-card">
            <h3>${category.name}</h3>
            <p class="item-count">${category.count}개 항목</p>
            <a href="#" onclick="DataController.loadCategoryItems('${category.id}'); return false;">보기</a>
          </div>
        `;
      });
      categoriesGrid.innerHTML = gridHtml;
    }
    
    // 사이드바 카테고리 목록 업데이트
    if (categoryList) {
      let listHtml = '';
      categories.forEach(category => {
        const isActive = category.id === AppState.selectedCategoryId;
        listHtml += `
          <li>
            <a href="#" 
               data-category-id="${category.id}" 
               class="${isActive ? 'active' : ''}"
               onclick="DataController.loadCategoryItems('${category.id}'); return false;">
              ${category.name} (${category.count})
            </a>
          </li>
        `;
      });
      categoryList.innerHTML = listHtml;
    }
    
    // 필터 드롭다운 업데이트
    if (categoryFilter) {
      let optionsHtml = '<option value="">모든 카테고리</option>';
      categories.forEach(category => {
        const isSelected = category.id === AppState.selectedCategoryId;
        optionsHtml += `
          <option value="${category.id}" ${isSelected ? 'selected' : ''}>
            ${category.name}
          </option>
        `;
      });
      categoryFilter.innerHTML = optionsHtml;
    }
  },
  
  /**
   * 카테고리별 항목 표시
   * @param {Array} items - 항목 목록
   */
  displayCategoryItems(items) {
    // 사전 뷰로 이동
    AppState.setCurrentView('dictionary');
    
    // 항목 표시
    this.displaySearchResults(items);
  },
  
  /**
   * 북마크된 항목 표시
   * @param {Array} items - 북마크된 항목 목록
   */
  displayBookmarkedItems(items) {
    // 목록 요소 가져오기
    const bookmarksList = document.getElementById('bookmarksList');
    
    if (!bookmarksList) return;
    
    // 항목이 없는 경우
    if (!items || items.length === 0) {
      bookmarksList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔖</div>
          <p class="empty-state-message">북마크한 항목이 없습니다.</p>
        </div>
      `;
      return;
    }
    
    // 항목 HTML 생성
    let html = '';
    items.forEach(item => {
      html += `
        <div class="item" data-id="${item.id}">
          <h3 class="item-title">
            <a href="#" onclick="DataController.viewItemDetail('${item.id}'); return false;">${item.name}</a>
          </h3>
          <div class="item-meta">
            ${item.type_name || ''} · ${item.dictionary_type === '1' ? '유적' : '용어'}
            ${item.view_count ? ` · 조회 ${item.view_count}회` : ''}
          </div>
          <div class="item-excerpt">${this.truncateText(item.content, 150)}</div>
          <div class="item-actions">
            <button onclick="DataController.toggleBookmark('${item.id}', false)">
              ★ 북마크 해제
            </button>
          </div>
        </div>
      `;
    });
    
    // HTML 업데이트
    bookmarksList.innerHTML = html;
    
    // 북마크 카운트 업데이트
    const bookmarksCount = document.getElementById('bookmarksCount');
    if (bookmarksCount) {
      bookmarksCount.textContent = items.length;
    }
  },
  
  /**
   * 최근 조회 항목 표시
   * @param {Array} items - 최근 조회 항목 목록
   */
  displayRecentItems(items) {
    // 목록 요소 가져오기
    const recentsList = document.getElementById('recentsList');
    const recentItemsList = document.getElementById('recentItemsList');
    
    // 최근 항목이 없는 경우
    if (!items || items.length === 0) {
      // 최근 조회 화면 업데이트
      if (recentsList) {
        recentsList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🕒</div>
            <p class="empty-state-message">최근 조회한 항목이 없습니다.</p>
          </div>
        `;
      }
      
      // 홈 화면 최근 항목 업데이트
      if (recentItemsList) {
        recentItemsList.innerHTML = `<li>최근 조회한 항목이 없습니다.</li>`;
      }
      
      return;
    }
    
    // 최근 조회 화면 업데이트
    if (recentsList) {
      let html = '';
      items.forEach(item => {
        html += `
          <div class="item" data-id="${item.id}">
            <h3 class="item-title">
              <a href="#" onclick="DataController.viewItemDetail('${item.id}'); return false;">${item.name}</a>
            </h3>
            <div class="item-meta">
              ${item.type_name || ''} · ${item.dictionary_type === '1' ? '유적' : '용어'}
              ${item.view_count ? ` · 조회 ${item.view_count}회` : ''}
              · ${this.formatDate(item.last_viewed)}
            </div>
            <div class="item-excerpt">${this.truncateText(item.content, 150)}</div>
            <div class="item-actions">
              <button onclick="DataController.toggleBookmark('${item.id}', ${!item.is_bookmarked})">
                ${item.is_bookmarked ? '★ 북마크 해제' : '☆ 북마크'}
              </button>
            </div>
          </div>
        `;
      });
      
      recentsList.innerHTML = html;
    }
    
    // 홈 화면 최근 항목 업데이트
    if (recentItemsList) {
      const maxItems = 5; // 홈 화면에는 최대 5개 항목만 표시
      let html = '';
      
      items.slice(0, maxItems).forEach(item => {
        html += `
          <li>
            <a href="#" onclick="DataController.viewItemDetail('${item.id}'); return false;">${item.name}</a>
            <span class="date">${this.formatDate(item.last_viewed)}</span>
          </li>
        `;
      });
      
      recentItemsList.innerHTML = html;
    }
    
    // 최근 조회 카운트 업데이트
    const recentsCount = document.getElementById('recentsCount');
    if (recentsCount) {
      recentsCount.textContent = items.length;
    }
  },
  
  /**
   * 전체 항목 수 표시
   * @param {number} count - 전체 항목 수
   */
  displayTotalItemsCount(count) {
    const totalItemsCount = document.getElementById('totalItemsCount');
    if (totalItemsCount) {
      totalItemsCount.textContent = count.toLocaleString();
    }
    
    AppState.totalItems = count;
  },
  
  /**
   * 데이터 상태 표시
   * @param {boolean} isLoaded - 데이터 로드 여부
   * @param {string} message - 상태 메시지
   */
  displayDataStatus(isLoaded, message) {
    const dataStatus = document.getElementById('dataStatus');
    const updateDataButton = document.getElementById('updateDataButton');
    
    if (dataStatus) {
      dataStatus.textContent = message;
    }
    
    if (updateDataButton) {
      updateDataButton.disabled = !isLoaded && message.includes('업데이트');
    }
    
    AppState.isDataLoaded = isLoaded;
  },
  
  /**
   * 페이지네이션 업데이트
   * @param {number} itemsCount - 현재 페이지 항목 수
   */
  updatePagination(itemsCount) {
    const pageInfo = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
    
    // 페이지 정보 업데이트
    pageInfo.textContent = `페이지 ${AppState.currentPage}`;
    
    // 이전/다음 버튼 상태 업데이트
    prevPageBtn.disabled = AppState.currentPage <= 1;
    nextPageBtn.disabled = itemsCount < AppState.itemsPerPage;
  },
  
  /**
   * 북마크 버튼 상태 업데이트
   * @param {string} itemId - 항목 ID
   * @param {boolean} isBookmarked - 북마크 상태
   */
  updateBookmarkButton(itemId, isBookmarked) {
    // 상세 모달의 북마크 버튼 업데이트
    const bookmarkButton = document.getElementById('bookmarkButton');
    if (bookmarkButton && bookmarkButton.getAttribute('onclick').includes(itemId)) {
      bookmarkButton.textContent = isBookmarked ? '★ 북마크 해제' : '☆ 북마크';
      bookmarkButton.setAttribute('onclick', `DataController.toggleBookmark('${itemId}', ${!isBookmarked})`);
    }
    
    // 목록의 북마크 버튼 업데이트
    const items = document.querySelectorAll(`.item[data-id="${itemId}"]`);
    items.forEach(item => {
      const button = item.querySelector('.item-actions button');
      if (button) {
        button.textContent = isBookmarked ? '★ 북마크 해제' : '☆ 북마크';
        button.setAttribute('onclick', `DataController.toggleBookmark('${itemId}', ${!isBookmarked})`);
      }
    });
    
    // 북마크된 항목이 사라진 경우, 북마크 목록 업데이트
    if (!isBookmarked && AppState.currentView === 'bookmarks') {
      DataController.loadBookmarkedItems();
    }
  },
  
  /**
   * 업데이트 진행 모달 표시
   */
  showUpdateProgressModal() {
    const modal = document.getElementById('updateProgressModal');
    if (modal) {
      modal.classList.add('active');
    }
    
    // 진행 상태 초기화
    this.updateProgress(0, '업데이트 준비 중...');
  },
  
  /**
   * 업데이트 진행 상태 업데이트
   * @param {number} progress - 진행률(0-100)
   * @param {string} message - 상태 메시지
   */
  updateProgress(progress, message) {
    const progressBar = document.getElementById('updateProgressBar');
    const progressText = document.getElementById('updateProgressText');
    
    if (progressBar) {
      const fill = progressBar.querySelector('.progress-bar-fill');
      if (fill) {
        fill.style.width = `${progress}%`;
      }
    }
    
    if (progressText) {
      progressText.textContent = message;
    }
  },
  
  /**
   * 모든 모달 닫기
   */
  closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.classList.remove('active');
    });
  },
  
  /**
   * 오류 메시지 표시
   * @param {string} message - 오류 메시지
   * @param {string} details - 상세 오류 정보
   */
  showError(message, details) {
    console.error(message, details);
    alert(`${message}\n\n${details || ''}`);
  },
  
  /**
   * 알림 메시지 표시
   * @param {string} message - 알림 메시지
   * @param {boolean} isConfirm - 확인 대화상자 여부
   */
  showMessage(message, isConfirm = false) {
    if (isConfirm) {
      return confirm(message);
    } else {
      alert(message);
      return true;
    }
  },
  
  /**
   * HTML 문자열에서 텍스트 추출 및 잘라내기
   * @param {string} html - HTML 문자열
   * @param {number} maxLength - 최대 길이
   * @returns {string} - 잘라낸 텍스트
   */
  truncateText(html, maxLength) {
    if (!html) return '';
    
    // HTML 태그 제거
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // 텍스트 길이 제한
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return text;
  },
  
  /**
   * HTML 콘텐츠 형식화
   * @param {string} content - HTML 콘텐츠
   * @returns {string} - 형식화된 HTML
   */
  formatContent(content) {
    if (!content) return '';
    
    // 이미 HTML인 경우 반환
    if (content.includes('<') && content.includes('>')) {
      return content;
    }
    
    // 일반 텍스트인 경우 줄바꿈 처리
    return content.replace(/\n/g, '<br>');
  },
  
  /**
   * 날짜 형식화
   * @param {string} dateString - 날짜 문자열
   * @returns {string} - 형식화된 날짜
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      // 오늘, 어제인 경우
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date >= today) {
        return '오늘';
      } else if (date >= yesterday) {
        return '어제';
      }
      
      // 일반 날짜 형식
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('날짜 형식화 오류:', error);
      return dateString;
    }
  }
};
