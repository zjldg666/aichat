// AiChat/utils/db.js

const DB_NAME = 'ai_chat_game';
const DB_PATH = '_doc/ai_chat.db';

export const DB = {
    // 1. 打开并初始化数据库
    init() {
            return new Promise((resolve, reject) => {
                // #ifdef APP-PLUS
                // 提取出一个公共的执行建表的方法
                const doCreate = () => {
                    this.createTables().then(resolve).catch(reject);
                };
    
                if (!plus.sqlite.isOpenDatabase({ name: DB_NAME, path: DB_PATH })) {
                    plus.sqlite.openDatabase({
                        name: DB_NAME,
                        path: DB_PATH,
                        success: () => {
                            console.log('📦 SQLite 数据库已连接');
                            doCreate(); // 连接成功后建表
                        },
                        fail: (e) => reject(e)
                    });
                } else {
                    // ✨ 核心修复：即使数据库处于打开状态，也要执行一遍建表逻辑！
                    // 这样热更新或者新增表结构时，就不会漏掉创建新表了。
                    doCreate(); 
                }
                // #endif
                
                // #ifndef APP-PLUS
                console.warn('SQLite 仅支持 App 端，当前环境将退回到 Mock 模式');
                resolve();
                // #endif
            });
        },

    // 2. 创建表结构 (消息表和日记表)
    createTables() {
        const sqls = [
            // 消息表：增加 chatId 区分不同角色，增加 id 唯一标识
            `CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chatId TEXT,
                role TEXT,
                content TEXT,
                type TEXT,
                isSystem INTEGER,
                timestamp INTEGER
            )`,
            // 日记表
            `CREATE TABLE IF NOT EXISTS diaries (
                id INTEGER PRIMARY KEY,
                roleId TEXT,
                dateStr TEXT,
                brief TEXT,
                detail TEXT,
                mood TEXT
            )`,
            // ✨ 新增：角色状态表
            `CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                name TEXT,
                worldId TEXT,
                data TEXT
            )`
        ];
        return Promise.all(sqls.map(sql => this.execute(sql)));
    },

    // 执行 SQL (增、删、改)
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

    // 查询 SQL
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

    // 简单的 SQL 参数化模拟 (SQLite 插件限制，需要手动处理转义)
    formatSql(sql, values) {
        if (!values.length) return sql;
        let i = 0;
        return sql.replace(/\?/g, () => {
            const val = values[i++];
            return typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        });
    },
	
	// 🔍 探测器：统计表内数据量
	    checkStats() {
	        return new Promise((resolve) => {
	            // #ifdef APP-PLUS
	            const sqlMsg = "SELECT COUNT(*) as count FROM messages";
	            const sqlDiary = "SELECT COUNT(*) as count FROM diaries";
	            
	            Promise.all([this.select(sqlMsg), this.select(sqlDiary)]).then(res => {
	                console.log('--- 📊 数据库存量监控 ---');
	                console.log(`💬 消息表: ${res[0][0].count} 条`);
	                console.log(`📖 日记表: ${res[1][0].count} 条`);
	                console.log('------------------------');
	                resolve();
	            });
	            // #endif
	        });
	    }
	
};