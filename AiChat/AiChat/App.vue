<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
			
			// #ifdef APP-PLUS
			// 监听通知栏点击事件
			plus.push.addEventListener('click', function(msg) {
				if (msg.payload) {
					try {
						// 尝试解析 payload
						let data = msg.payload;
						if (typeof data === 'string') {
							data = JSON.parse(data);
						}
						
						// 如果包含了角色ID，直接跳转到对应的聊天窗口
						if (data.id) {
							console.log('🔔 [System] Notification clicked, jumping to chat:', data.id);
							// 使用 navigateTo 跳转
							uni.navigateTo({
								url: `/pages/chat/chat?id=${data.id}`
							});
						}
					} catch (e) {
						console.error('Notification payload parse error:', e);
					}
				}
			}, false);
			// #endif
		},
		onShow: function() {
			console.log('App Show')
			// #ifdef APP-PLUS
			// 每次回到前台，清除所有通知红点（可选）
			plus.push.clear(); 
			// #endif
		},
		onHide: function() {
			console.log('App Hide - Scheduling Notifications for ALL characters')
			this.scheduleAllNotifications();
		},
		methods: {
			scheduleAllNotifications() {
				// #ifdef APP-PLUS
				console.log('🔔 [System] Scheduling notifications with staggering...');
				plus.push.clear(); // 清除旧的，重新排班
				
				const list = uni.getStorageSync('contact_list') || [];
				if (list.length === 0) return;
				
				// 过滤出开启了主动聊天且允许通知的角色
				const activeRoles = list.filter(r => r.allowProactive && r.proactiveNotify);
				
				activeRoles.forEach((role, index) => {
                    // 1. 基础间隔 (小时 -> 秒)
                    const intervalHours = role.proactiveInterval || 4;
                    const baseDelay = intervalHours * 60 * 60;
                    
                    // 2. 错峰算法 (Staggering Strategy)
                    // 策略：每个角色在前一个角色的基础上推迟 10 分钟，并加上 0-60秒 随机
                    // 这样即使大家都是 4 小时，也会分别是：4:00, 4:10, 4:20 收到消息
                    const staggerMinutes = index * 10; 
                    const randomSeconds = Math.floor(Math.random() * 60); 
                    
                    const finalDelay = baseDelay + (staggerMinutes * 60) + randomSeconds;
                    
                    // 3. 构造通知
                    const content = `${role.name} 发来了一条新消息`;
                    const payload = { id: role.id };
                    const options = {
                        cover: false,
                        delay: finalDelay, 
                        title: "AiChat"
                    };
                    
                    plus.push.createMessage(content, JSON.stringify(payload), options);
                    console.log(`📅 [Notify] ${role.name}: Scheduled in ${intervalHours}h + ${staggerMinutes}m`);
				});
				// #endif
			}
		}
	}
</script>

<style>
	/*每个页面公共css */
	page {
		font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
	}
</style>