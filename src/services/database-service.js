const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

/**
 * 데이터베이스 서비스 클래스
 * 한국고고학사전 데이터 관리를 위한 서비스
 */
class DatabaseService {
  /**
   * 생성자
   * @param {string} dbPath - 데이터베이스 파일 경로
   */
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * 데이터베이스 초기화
   * 테이블 생성 및 인덱스 설정
   */
  async initialize() {
    try {
      // 데이터베이스 디렉토리 확인
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 데이터베이스 연결
      this.db = new sqlite3(this.dbPath, { verbose: log.debug });
      
      // 테이블 생성
      this.db.exec(`
        -- 사전 항목 테이블
        CREATE TABLE IF NOT EXISTS dictionary_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          content TEXT,
          reference TEXT,
          dictionary_type TEXT,
          type_code TEXT,
          type_name TEXT,
          copyright TEXT,
          data_link TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        -- 사용자 데이터 테이블 (북마크, 노트 등)
        CREATE TABLE IF NOT EXISTS user_data (
          item_id TEXT PRIMARY KEY,
          is_bookmarked INTEGER DEFAULT 0,
          note TEXT,
          last_viewed TEXT,
          view_count INTEGER DEFAULT 0,
          FOREIGN KEY (item_id) REFERENCES dictionary_items(id)
        );
        
        -- 검색용 가상 테이블 (FTS5)
        CREATE VIRTUAL TABLE IF NOT EXISTS dictionary_items_fts USING fts5(
          name, 
          content, 
          reference,
          type_name,
          content='dictionary_items',
          content_rowid='rowid'
        );
        
        -- 트리거: 항목 추가 시 FTS 인덱스에도 추가
        CREATE TRIGGER IF NOT EXISTS dictionary_items_ai AFTER INSERT ON dictionary_items BEGIN
          INSERT INTO dictionary_items_fts(rowid, name, content, reference, type_name)
          VALUES (new.rowid, new.name, new.content, new.reference, new.type_name);
        END;
        
        -- 트리거: 항목 수정 시 FTS 인덱스도 수정
        CREATE TRIGGER IF NOT EXISTS dictionary_items_au AFTER UPDATE ON dictionary_items BEGIN
          INSERT INTO dictionary_items_fts(dictionary_items_fts, rowid, name, content, reference, type_name)
          VALUES('delete', old.rowid, old.name, old.content, old.reference, old.type_name);
          INSERT INTO dictionary_items_fts(rowid, name, content, reference, type_name)
          VALUES (new.rowid, new.name, new.content, new.reference, new.type_name);
        END;
        
        -- 트리거: 항목 삭제 시 FTS 인덱스에서도 삭제
        CREATE TRIGGER IF NOT EXISTS dictionary_items_ad AFTER DELETE ON dictionary_items BEGIN
          INSERT INTO dictionary_items_fts(dictionary_items_fts, rowid, name, content, reference, type_name)
          VALUES('delete', old.rowid, old.name, old.content, old.reference, old.type_name);
        END;
        
        -- 인덱스 생성
        CREATE INDEX IF NOT EXISTS idx_dictionary_items_name ON dictionary_items(name);
        CREATE INDEX IF NOT EXISTS idx_dictionary_items_type ON dictionary_items(dictionary_type);
        CREATE INDEX IF NOT EXISTS idx_user_data_bookmarked ON user_data(is_bookmarked);
      `);
      
      log.info('데이터베이스 스키마 초기화 완료');
      return true;
    } catch (error) {
      log.error('데이터베이스 초기화 오류:', error);
      throw error;
    }
  }

  /**
   * 항목 검색
   * @param {string} query - 검색 쿼리
   * @param {Object} filters - 검색 필터 (카테고리, 타입 등)
   * @returns {Array} - 검색 결과
   */
  async searchItems(query, filters = {}) {
    try {
      const { categoryId, type, bookmarked, limit = 100, offset = 0 } = filters;
      
      // 검색어가 없는 경우 (전체 목록)
      if (!query || query.trim() === '') {
        let sql = `
          SELECT i.*, ud.is_bookmarked, ud.note, ud.last_viewed, ud.view_count
          FROM dictionary_items i
          LEFT JOIN user_data ud ON i.id = ud.item_id
          WHERE 1=1
        `;
        
        const params = [];
        
        // 필터 적용
        if (categoryId) {
          sql += ' AND i.type_code = ?';
          params.push(categoryId);
        }
        
        if (type) {
          sql += ' AND i.dictionary_type = ?';
          params.push(type);
        }
        
        if (bookmarked === true) {
          sql += ' AND ud.is_bookmarked = 1';
        }
        
        sql += ' ORDER BY i.name COLLATE NOCASE ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
      }
      
      // 검색어가 있는 경우 (FTS 사용)
      let sql = `
        SELECT i.*, ud.is_bookmarked, ud.note, ud.last_viewed, ud.view_count,
               highlight(dictionary_items_fts, 0, '<mark>', '</mark>') as name_highlight,
               highlight(dictionary_items_fts, 1, '<mark>', '</mark>') as content_highlight
        FROM dictionary_items_fts
        JOIN dictionary_items i ON dictionary_items_fts.rowid = i.rowid
        LEFT JOIN user_data ud ON i.id = ud.item_id
        WHERE dictionary_items_fts MATCH ?
      `;
      
      const params = [query + '*'];
      
      // 필터 적용
      if (categoryId) {
        sql += ' AND i.type_code = ?';
        params.push(categoryId);
      }
      
      if (type) {
        sql += ' AND i.dictionary_type = ?';
        params.push(type);
      }
      
      if (bookmarked === true) {
        sql += ' AND ud.is_bookmarked = 1';
      }
      
      sql += ' ORDER BY rank LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const stmt = this.db.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      log.error('검색 오류:', error);
      throw error;
    }
  }

  /**
   * ID로 항목 조회
   * @param {string} itemId - 항목 ID
   * @returns {Object} - 항목 정보
   */
  async getItemById(itemId) {
    try {
      const stmt = this.db.prepare(`
        SELECT i.*, ud.is_bookmarked, ud.note, ud.last_viewed, ud.view_count
        FROM dictionary_items i
        LEFT JOIN user_data ud ON i.id = ud.item_id
        WHERE i.id = ?
      `);
      
      const item = stmt.get(itemId);
      
      if (item) {
        // 조회 횟수 증가 및 최근 조회 시간 업데이트
        this.updateViewCount(itemId);
      }
      
      return item;
    } catch (error) {
      log.error('항목 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 조회 횟수 및 최근 조회 시간 업데이트
   * @param {string} itemId - 항목 ID
   */
  async updateViewCount(itemId) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_data (item_id, view_count, last_viewed)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(item_id) DO UPDATE
        SET view_count = view_count + 1, last_viewed = CURRENT_TIMESTAMP
      `);
      
      stmt.run(itemId);
    } catch (error) {
      log.error('조회 횟수 업데이트 오류:', error);
      // 핵심 기능이 아니므로 오류를 throw하지 않음
    }
  }

  /**
   * 북마크 토글
   * @param {string} itemId - 항목 ID
   * @param {boolean} isBookmarked - 북마크 여부
   */
  async toggleBookmark(itemId, isBookmarked) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_data (item_id, is_bookmarked)
        VALUES (?, ?)
        ON CONFLICT(item_id) DO UPDATE
        SET is_bookmarked = ?
      `);
      
      stmt.run(itemId, isBookmarked ? 1 : 0, isBookmarked ? 1 : 0);
      return true;
    } catch (error) {
      log.error('북마크 토글 오류:', error);
      throw error;
    }
  }

  /**
   * 노트 저장
   * @param {string} itemId - 항목 ID
   * @param {string} noteText - 노트 내용
   */
  async saveNote(itemId, noteText) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_data (item_id, note)
        VALUES (?, ?)
        ON CONFLICT(item_id) DO UPDATE
        SET note = ?
      `);
      
      stmt.run(itemId, noteText, noteText);
      return true;
    } catch (error) {
      log.error('노트 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 카테고리 목록 조회
   * @returns {Array} - 카테고리 목록
   */
  async getCategories() {
    try {
      const stmt = this.db.prepare(`
        SELECT type_code as id, type_name as name, COUNT(*) as count
        FROM dictionary_items
        GROUP BY type_code, type_name
        ORDER BY type_name
      `);
      
      return stmt.all();
    } catch (error) {
      log.error('카테고리 목록 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 카테고리별 항목 조회
   * @param {string} categoryId - 카테고리 ID
   * @returns {Array} - 항목 목록
   */
  async getCategoryItems(categoryId) {
    try {
      const stmt = this.db.prepare(`
        SELECT i.*, ud.is_bookmarked, ud.note, ud.last_viewed, ud.view_count
        FROM dictionary_items i
        LEFT JOIN user_data ud ON i.id = ud.item_id
        WHERE i.type_code = ?
        ORDER BY i.name COLLATE NOCASE ASC
      `);
      
      return stmt.all(categoryId);
    } catch (error) {
      log.error('카테고리별 항목 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 북마크된 항목 조회
   * @returns {Array} - 북마크된 항목 목록
   */
  async getBookmarkedItems() {
    try {
      const stmt = this.db.prepare(`
        SELECT i.*, ud.is_bookmarked, ud.note, ud.last_viewed, ud.view_count
        FROM dictionary_items i
        JOIN user_data ud ON i.id = ud.item_id
        WHERE ud.is_bookmarked = 1
        ORDER BY i.name COLLATE NOCASE ASC
      `);
      
      return stmt.all();
    } catch (error) {
      log.error('북마크된 항목 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 최근 조회 항목 조회
   * @param {number} limit - 조회 개수
   * @returns {Array} - 최근 조회 항목 목록
   */
  async getRecentItems(limit = 10) {
    try {
      const stmt = this.db.prepare(`
        SELECT i.*, ud.is_bookmarked, ud.note, ud.last_viewed, ud.view_count
        FROM dictionary_items i
        JOIN user_data ud ON i.id = ud.item_id
        WHERE ud.last_viewed IS NOT NULL
        ORDER BY ud.last_viewed DESC
        LIMIT ?
      `);
      
      return stmt.all(limit);
    } catch (error) {
      log.error('최근 조회 항목 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 항목 저장 (단일)
   * @param {Object} item - 항목 정보
   */
  async saveItem(item) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO dictionary_items (
          id, name, content, reference, dictionary_type, 
          type_code, type_name, copyright, data_link, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          content = excluded.content,
          reference = excluded.reference,
          dictionary_type = excluded.dictionary_type,
          type_code = excluded.type_code,
          type_name = excluded.type_name,
          copyright = excluded.copyright,
          data_link = excluded.data_link,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      stmt.run(
        item.IDX || item.id,
        item.NAME || item.name,
        item.CONTENT || item.content,
        item.ETC || item.reference,
        item.GUBUN || item.dictionary_type,
        item.TYPE_GBN || item.type_code,
        item.TYPE_GBN_NM || item.type_name,
        item.COPYRIGHT || item.copyright,
        item.DATA_LINK || item.data_link
      );
      
      return true;
    } catch (error) {
      log.error('항목 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 항목 일괄 저장
   * @param {Array} items - 항목 목록
   */
  async saveItems(items) {
    try {
      // 트랜잭션 시작
      const transaction = this.db.transaction((items) => {
        const stmt = this.db.prepare(`
          INSERT INTO dictionary_items (
            id, name, content, reference, dictionary_type, 
            type_code, type_name, copyright, data_link, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            content = excluded.content,
            reference = excluded.reference,
            dictionary_type = excluded.dictionary_type,
            type_code = excluded.type_code,
            type_name = excluded.type_name,
            copyright = excluded.copyright,
            data_link = excluded.data_link,
            updated_at = CURRENT_TIMESTAMP
        `);
        
        for (const item of items) {
          stmt.run(
            item.IDX || item.id,
            item.NAME || item.name,
            item.CONTENT || item.content,
            item.ETC || item.reference,
            item.GUBUN || item.dictionary_type,
            item.TYPE_GBN || item.type_code,
            item.TYPE_GBN_NM || item.type_name,
            item.COPYRIGHT || item.copyright,
            item.DATA_LINK || item.data_link
          );
        }
      });
      
      // 트랜잭션 실행
      transaction(items);
      
      log.info(`${items.length}개 항목 저장 완료`);
      return true;
    } catch (error) {
      log.error('항목 일괄 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 모든 항목 조회
   * @returns {Array} - 모든 항목 목록
   */
  async getAllItems() {
    try {
      const stmt = this.db.prepare(`
        SELECT i.*, ud.is_bookmarked, ud.note, ud.last_viewed, ud.view_count
        FROM dictionary_items i
        LEFT JOIN user_data ud ON i.id = ud.item_id
        ORDER BY i.name COLLATE NOCASE ASC
      `);
      
      return stmt.all();
    } catch (error) {
      log.error('모든 항목 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 초기화 (모든 데이터 삭제)
   */
  async resetDatabase() {
    try {
      // 트랜잭션 시작
      const transaction = this.db.transaction(() => {
        // 사용자 데이터 삭제
        this.db.prepare('DELETE FROM user_data').run();
        
        // 사전 항목 삭제
        this.db.prepare('DELETE FROM dictionary_items').run();
        
        // FTS 테이블 초기화
        this.db.prepare('DELETE FROM dictionary_items_fts').run();
      });
      
      // 트랜잭션 실행
      transaction();
      
      log.info('데이터베이스 초기화 완료');
      return true;
    } catch (error) {
      log.error('데이터베이스 초기화 오류:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 연결 종료
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = DatabaseService;