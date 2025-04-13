const axios = require('axios');
const log = require('electron-log');

/**
 * API 서비스 클래스
 * 문화재청 Open API 통신을 담당하는 서비스
 */
class ApiService {
  /**
   * 생성자
   */
  constructor() {
    // API 기본 URL
    this.apiUrl = 'http://portal.nrich.go.kr/kor/openapi.do';
    
    // 한국고고학사전 API 인덱스
    this.apiIdx = 39;
    
    // 한 페이지당 레코드 수
    this.recordsPerPage = 100;
    
    // HTTP 클라이언트 설정
    this.client = axios.create({
      timeout: 30000, // 30초 타임아웃
      headers: {
        'Accept': 'application/json, application/xml',
        'User-Agent': 'ArchaeologyDictionary/1.0.0'
      }
    });
    
    // 에러 핸들링
    this.client.interceptors.response.use(
      response => response,
      error => {
        log.error('API 요청 오류:', error.message);
        
        if (error.response) {
          log.error('상태 코드:', error.response.status);
          log.error('응답 데이터:', error.response.data);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * 총 레코드 수 조회
   * @returns {number} - 총 레코드 수
   */
  async getTotalCount() {
    try {
      const response = await this.client.get(this.apiUrl, {
        params: {
          idx: this.apiIdx,
          firstindex: 1,
          recordcountperpage: 1,
          resulttype: 'json'
        }
      });
      
      if (response.data && response.data.TOTAL_COUNT) {
        return parseInt(response.data.TOTAL_COUNT);
      }
      
      log.warn('총 레코드 수를 확인할 수 없습니다.');
      return 0;
    } catch (error) {
      log.error('총 레코드 수 조회 오류:', error.message);
      throw new Error(`총 레코드 수 조회 실패: ${error.message}`);
    }
  }

  /**
   * 데이터 다운로드
   * @param {Function} progressCallback - 진행 상태 콜백 함수
   * @returns {Array} - 다운로드된 데이터
   */
  async downloadData(progressCallback = null) {
    try {
      // 총 레코드 수 확인
      const totalCount = await this.getTotalCount();
      
      if (totalCount === 0) {
        throw new Error('다운로드할 데이터가 없습니다.');
      }
      
      log.info(`다운로드할 항목 수: ${totalCount}`);
      
      // 모든 항목을 저장할 배열
      const allItems = [];
      
      // 페이지 단위로 데이터 다운로드
      const totalPages = Math.ceil(totalCount / this.recordsPerPage);
      
      for (let page = 1; page <= totalPages; page++) {
        const firstIndex = (page - 1) * this.recordsPerPage + 1;
        
        // 진행 상태 보고
        if (progressCallback) {
          progressCallback({
            page,
            totalPages,
            progress: Math.floor((page - 1) / totalPages * 100),
            message: `페이지 ${page}/${totalPages} 다운로드 중... (${firstIndex}-${Math.min(firstIndex + this.recordsPerPage - 1, totalCount)}/${totalCount})`
          });
        }
        
        // 데이터 요청
        const response = await this.client.get(this.apiUrl, {
          params: {
            idx: this.apiIdx,
            firstindex: firstIndex,
            recordcountperpage: this.recordsPerPage,
            resulttype: 'json'
          }
        });
        
        // 응답 유효성 검사
        if (!response.data || !response.data.items || !Array.isArray(response.data.items)) {
          log.warn(`페이지 ${page} 응답이 유효하지 않습니다.`, response.data);
          continue;
        }
        
        // 항목 추가
        allItems.push(...response.data.items);
        
        log.info(`페이지 ${page}/${totalPages} 다운로드 완료 (${response.data.items.length}개 항목)`);
        
        // API 부하 방지를 위한 딜레이
        if (page < totalPages) {
          await this.delay(500);
        }
      }
      
      // 최종 진행 상태 보고
      if (progressCallback) {
        progressCallback({
          page: totalPages,
          totalPages,
          progress: 100,
          message: '데이터 다운로드 완료'
        });
      }
      
      log.info(`총 ${allItems.length}개 항목 다운로드 완료`);
      return allItems;
    } catch (error) {
      log.error('데이터 다운로드 오류:', error.message);
      throw new Error(`데이터 다운로드 실패: ${error.message}`);
    }
  }

  /**
   * 항목 상세 정보 조회
   * @param {string} itemId - 항목 ID
   * @returns {Object} - 항목 상세 정보
   */
  async getItemDetail(itemId) {
    try {
      const response = await this.client.get(this.apiUrl, {
        params: {
          idx: this.apiIdx,
          firstindex: 1,
          recordcountperpage: 1,
          resulttype: 'json',
          search_id: itemId
        }
      });
      
      if (response.data && response.data.items && Array.isArray(response.data.items) && response.data.items.length > 0) {
        return response.data.items[0];
      }
      
      throw new Error('항목을 찾을 수 없습니다.');
    } catch (error) {
      log.error('항목 상세 정보 조회 오류:', error.message);
      throw new Error(`항목 상세 정보 조회 실패: ${error.message}`);
    }
  }

  /**
   * 카테고리 목록 조회
   * @returns {Array} - 카테고리 목록
   */
  async getCategories() {
    try {
      // 문화재청 API는 카테고리 목록을 제공하지 않으므로 샘플 데이터를 다운로드하여 카테고리 추출
      const response = await this.client.get(this.apiUrl, {
        params: {
          idx: this.apiIdx,
          firstindex: 1,
          recordcountperpage: 100, // 샘플로 100개 항목만 가져옴
          resulttype: 'json'
        }
      });
      
      if (!response.data || !response.data.items || !Array.isArray(response.data.items)) {
        throw new Error('카테고리 정보를 가져올 수 없습니다.');
      }
      
      // 카테고리 정보 추출
      const categories = {};
      
      response.data.items.forEach(item => {
        if (item.TYPE_GBN && item.TYPE_GBN_NM) {
          categories[item.TYPE_GBN] = item.TYPE_GBN_NM;
        }
      });
      
      // 배열로 변환
      const result = Object.entries(categories).map(([id, name]) => ({ id, name }));
      
      return result;
    } catch (error) {
      log.error('카테고리 목록 조회 오류:', error.message);
      throw new Error(`카테고리 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 키워드 검색
   * @param {string} keyword - 검색 키워드
   * @param {number} pageIndex - 페이지 인덱스
   * @param {number} pageSize - 페이지 크기
   * @returns {Object} - 검색 결과
   */
  async searchByKeyword(keyword, pageIndex = 1, pageSize = 20) {
    try {
      const response = await this.client.get(this.apiUrl, {
        params: {
          idx: this.apiIdx,
          firstindex: (pageIndex - 1) * pageSize + 1,
          recordcountperpage: pageSize,
          resulttype: 'json',
          search_word: keyword
        }
      });
      
      if (!response.data || !response.data.items || !Array.isArray(response.data.items)) {
        return {
          items: [],
          totalCount: 0,
          pageIndex,
          pageSize
        };
      }
      
      return {
        items: response.data.items,
        totalCount: parseInt(response.data.TOTAL_COUNT || '0'),
        pageIndex,
        pageSize
      };
    } catch (error) {
      log.error('키워드 검색 오류:', error.message);
      throw new Error(`키워드 검색 실패: ${error.message}`);
    }
  }

  /**
   * 지연 함수
   * @param {number} ms - 지연시간 (밀리초)
   * @returns {Promise} - 타이머 Promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * API 연결 테스트
   * @returns {boolean} - 연결 성공 여부
   */
  async testConnection() {
    try {
      const response = await this.client.get(this.apiUrl, {
        params: {
          idx: this.apiIdx,
          firstindex: 1,
          recordcountperpage: 1,
          resulttype: 'json'
        },
        timeout: 10000 // 연결 테스트는 짧은 타임아웃 설정
      });
      
      return response.status === 200 && response.data && response.data.items;
    } catch (error) {
      log.error('API 연결 테스트 실패:', error.message);
      return false;
    }
  }
}

module.exports = ApiService;