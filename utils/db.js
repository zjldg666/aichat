// AiChat/utils/db.js

const DB_NAME = 'ai_chat_game';
const DB_PATH = '_doc/ai_chat.db';

export const DB = {
    // 1. 打开并初始化数据库 (完全保持原样)
    init() {
        return new Promise((resolve, reject) => {
            // #ifdef APP-PLUS
            if (!plus.sqlite.isOpenDatabase({ name: DB_NAME, path: DB_PATH })) {
                plus.sqlite.openDatabase({
                    name: DB_NAME,
                    path: DB_PATH,
                    success: () => {
                        console.log('📦 SQLite 数据库已连接');
                        this.createTables().then(resolve).catch(reject);
                    },
                    fail: (e) => reject(e)
                });
            } else {
                resolve();
            }
            // #endif
            // #ifndef APP-PLUS
            console.warn('SQLite 仅支持 App 端，当前环境将退回到 Mock 模式');
            resolve();
            // #endif
        });
    },

    // 2. 创建表结构 (只追加了 scenarios 表，原有的 messages 和 diaries 未动)
    createTables() {
        const sqls = [
            // --- 原有表结构 (保持不变) ---
            `CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chatId TEXT,
                role TEXT,
                content TEXT,
                type TEXT,
                isSystem INTEGER,
                timestamp INTEGER
            )`,
            `CREATE TABLE IF NOT EXISTS diaries (
                id INTEGER PRIMARY KEY,
                roleId TEXT,
                dateStr TEXT,
                brief TEXT,
                detail TEXT,
                mood TEXT
            )`,
            
            // --- ✨ 新增：场景表 (scenarios) ---
            // 仅仅是追加了这个表定义，完全不影响上面两个表
            `CREATE TABLE IF NOT EXISTS scenarios (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                cover TEXT,
                npcs TEXT,
                items TEXT,
                player_setup TEXT,
                bgm TEXT,
                created_at INTEGER
            )`
        ];
        return Promise.all(sqls.map(sql => this.execute(sql)));
    },

    // 执行 SQL (保持原样)
    execute(sql, values = []) {
        return new Promise((resolve, reject) => {
            plus.sqlite.executeSql({
                name: DB_NAME,
                sql: this.formatSql(sql, values),
                success: (res) => resolve(res),
                fail: (e) => reject(e)
            });
        });
    },

    // 查询 SQL (保持原样)
    select(sql, values = []) {
        return new Promise((resolve, reject) => {
            plus.sqlite.selectSql({
                name: DB_NAME,
                sql: this.formatSql(sql, values),
                success: (res) => resolve(res),
                fail: (e) => reject(e)
            });
        });
    },

    // 参数化模拟 (保持原样)
    formatSql(sql, values) {
        if (!values.length) return sql;
        let i = 0;
        return sql.replace(/\?/g, () => {
            const val = values[i++];
            return typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        });
    },
    
    // 🔍 探测器：统计表内数据量 (只加了 scenarios 的统计)
    checkStats() {
        return new Promise((resolve) => {
            // #ifdef APP-PLUS
            const sqlMsg = "SELECT COUNT(*) as count FROM messages";
            const sqlDiary = "SELECT COUNT(*) as count FROM diaries";
            const sqlScenario = "SELECT COUNT(*) as count FROM scenarios"; // 新增查询
            
            // 这里加了一个 catch，防止老用户没有 scenarios 表导致报错，非常安全
            Promise.all([
                this.select(sqlMsg), 
                this.select(sqlDiary),
                this.select(sqlScenario).catch(()=>[[{count:0}]]) 
            ]).then(res => {
                console.log('--- 📊 数据库存量监控 ---');
                console.log(`💬 消息表: ${res[0][0].count} 条`);
                console.log(`📖 日记表: ${res[1][0].count} 条`);
                console.log(`🎭 场景表: ${res[2][0].count} 个`); // 新增日志
                console.log('------------------------');
                resolve();
            });
            // #endif
        });
    }
};