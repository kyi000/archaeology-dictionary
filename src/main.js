// Electron 주요 모듈 임포트
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// 자체 서비스 모듈 임포트
const DatabaseService = require('./services/database-service');
const ApiService = require('./services/api-service');

// 개발 환경 확인
const isDev = process.env.NODE_ENV === 'development';

// 로그 설정
log.transports.file.level = 'info';
log.info('애플리케이션 시작');

// 메인 윈도우 참조 유지
let mainWindow;
let databaseService;
let apiService;

// 사용자 데이터 경로 설정
const userDataPath = app.getPath('userData');
log.info(`사용자 데이터 경로: ${userDataPath}`);

// 자동 업데이트 설정
autoUpdater.logger = log;
autoUpdater.checkForUpdatesAndNotify();

/**
 * 메인 윈도우 생성 함수
 */
function createWindow() {
  // 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '한국고고학사전',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // 메인 HTML 파일 로드
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 개발 환경에서 DevTools 열기
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 서비스 초기화
  initializeServices();

  // 윈도우 닫힐 때 이벤트
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 메뉴 생성
  createMenu();
}

/**
 * 서비스 초기화 함수
 */
function initializeServices() {
  // 데이터베이스 서비스 초기화
  const dbPath = path.join(userDataPath, 'archaeologyDB.db');
  databaseService = new DatabaseService(dbPath);
  databaseService.initialize()
    .then(() => {
      log.info('데이터베이스 초기화 완료');
      mainWindow.webContents.send('database-ready');
    })
    .catch(err => {
      log.error('데이터베이스 초기화 오류:', err);
      dialog.showErrorBox('데이터베이스 오류', '데이터베이스를 초기화하는 중 오류가 발생했습니다.');
    });

  // API 서비스 초기화
  apiService = new ApiService();
}

/**
 * 애플리케이션 메뉴 생성 함수
 */
function createMenu() {
  const template = [
    {
      label: '파일',
      submenu: [
        {
          label: '데이터 업데이트',
          click: () => {
            mainWindow.webContents.send('show-update-dialog');
          }
        },
        {
          label: '데이터 내보내기',
          click: () => {
            exportData();
          }
        },
        { type: 'separator' },
        {
          label: '종료',
          role: 'quit'
        }
      ]
    },
    {
      label: '보기',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '도구',
      submenu: [
        {
          label: '모든 데이터 삭제',
          click: () => {
            resetAllData();
          }
        },
        {
          label: '설정',
          click: () => {
            mainWindow.webContents.send('show-settings');
          }
        }
      ]
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '소개',
          click: () => {
            showAboutDialog();
          }
        },
        {
          label: '업데이트 확인',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify();
          }
        },
        { type: 'separator' },
        {
          label: '문화재청 포털 방문',
          click: () => {
            shell.openExternal('https://portal.nrich.go.kr');
          }
        },
        {
          label: '깃허브 저장소',
          click: () => {
            shell.openExternal('https://github.com/kyi000/archaeology-dictionary');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 데이터 내보내기 함수
 */
async function exportData() {
  try {
    const { filePath } = await dialog.showSaveDialog({
      title: '데이터 내보내기',
      defaultPath: path.join(app.getPath('documents'), '한국고고학사전_데이터.json'),
      filters: [
        { name: 'JSON 파일', extensions: ['json'] },
        { name: '모든 파일', extensions: ['*'] }
      ]
    });

    if (!filePath) return;

    const data = await databaseService.getAllItems();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    dialog.showMessageBox({
      type: 'info',
      title: '내보내기 완료',
      message: '데이터가 성공적으로 내보내기 되었습니다.',
      buttons: ['확인']
    });
  } catch (error) {
    log.error('데이터 내보내기 오류:', error);
    dialog.showErrorBox('내보내기 오류', '데이터를 내보내는 중 오류가 발생했습니다.');
  }
}

/**
 * 모든 데이터 초기화 함수
 */
async function resetAllData() {
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: '데이터 초기화',
    message: '모든 데이터를 삭제하시겠습니까?',
    detail: '이 작업은 되돌릴 수 없으며, 사용자 노트와 북마크를 포함한 모든 데이터가 삭제됩니다.',
    buttons: ['취소', '삭제'],
    cancelId: 0
  });

  if (response === 1) {
    try {
      await databaseService.resetDatabase();
      mainWindow.webContents.send('data-reset-complete');
      
      dialog.showMessageBox({
        type: 'info',
        title: '초기화 완료',
        message: '모든 데이터가 성공적으로 초기화되었습니다.',
        buttons: ['확인']
      });
    } catch (error) {
      log.error('데이터 초기화 오류:', error);
      dialog.showErrorBox('초기화 오류', '데이터를 초기화하는 중 오류가 발생했습니다.');
    }
  }
}

/**
 * 소개 대화상자 표시 함수
 */
function showAboutDialog() {
  dialog.showMessageBox({
    title: '한국고고학사전 정보',
    message: '한국고고학사전',
    detail: `버전: ${app.getVersion()}\n\n이 애플리케이션은 문화재청 매장문화재 포털에서 제공하는 한국고고학사전 데이터를 활용합니다.\n\n© 2025 개발자`,
    buttons: ['확인']
  });
}

// IPC 이벤트 리스너 등록
ipcMain.on('search-items', async (event, query, filters) => {
  try {
    const results = await databaseService.searchItems(query, filters);
    mainWindow.webContents.send('search-results', results);
  } catch (error) {
    log.error('검색 오류:', error);
    mainWindow.webContents.send('search-error', error.message);
  }
});

ipcMain.on('get-item-detail', async (event, itemId) => {
  try {
    const item = await databaseService.getItemById(itemId);
    mainWindow.webContents.send('item-detail', item);
  } catch (error) {
    log.error('상세 정보 조회 오류:', error);
    mainWindow.webContents.send('item-detail-error', error.message);
  }
});

ipcMain.on('update-data', async (event) => {
  try {
    mainWindow.webContents.send('update-started');
    
    // 총 항목 수 확인
    const totalCount = await apiService.getTotalCount();
    log.info(`총 ${totalCount}개 항목 발견`);
    
    // 데이터 다운로드
    const data = await apiService.downloadData(progress => {
      mainWindow.webContents.send('update-progress', progress);
    });
    
    // 데이터베이스에 저장
    await databaseService.saveItems(data);
    
    mainWindow.webContents.send('update-completed', { count: data.length });
  } catch (error) {
    log.error('데이터 업데이트 오류:', error);
    mainWindow.webContents.send('update-error', error.message);
  }
});

ipcMain.on('toggle-bookmark', async (event, itemId, isBookmarked) => {
  try {
    await databaseService.toggleBookmark(itemId, isBookmarked);
    mainWindow.webContents.send('bookmark-updated', { itemId, isBookmarked });
  } catch (error) {
    log.error('북마크 업데이트 오류:', error);
    mainWindow.webContents.send('bookmark-error', error.message);
  }
});

ipcMain.on('save-note', async (event, itemId, noteText) => {
  try {
    await databaseService.saveNote(itemId, noteText);
    mainWindow.webContents.send('note-saved', { itemId });
  } catch (error) {
    log.error('노트 저장 오류:', error);
    mainWindow.webContents.send('note-error', error.message);
  }
});

// 애플리케이션 초기화
app.whenReady().then(() => {
  createWindow();

  // macOS에서 애플리케이션 활성화 시 윈도우 생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 윈도우가 닫히면 애플리케이션 종료 (Windows/Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 종료 전 클린업
app.on('before-quit', () => {
  log.info('애플리케이션 종료');
  // 필요한 클린업 작업 수행
});

// 자동 업데이트 이벤트 핸들러
autoUpdater.on('update-available', () => {
  log.info('업데이트 가능');
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  log.info('업데이트 다운로드 완료');
  dialog.showMessageBox({
    title: '업데이트 준비 완료',
    message: '새 버전이 다운로드되었습니다.',
    detail: '애플리케이션을 다시 시작하여 업데이트를 적용하시겠습니까?',
    buttons: ['나중에', '지금 다시 시작'],
    cancelId: 0
  }).then(result => {
    if (result.response === 1) {
      autoUpdater.quitAndInstall();
    }
  });
});