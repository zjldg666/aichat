<template>
	<view class="create-container" :class="{ 'dark-mode': isDarkMode }">
		<scroll-view scroll-y class="form-scroll">

			<view class="form-section">
				<view class="section-header" @click="toggleSection('basic')">
					<view class="section-title-wrapper">
						<view class="section-title">角色基本信息</view>
						<text class="section-subtitle">{{ isEditMode ? '修改设置' : '创建新角色' }}</text>
					</view>
					<text class="arrow-icon">{{ activeSections.basic ? '▼' : '▶' }}</text>
				</view>

				<view v-show="activeSections.basic" class="section-content">
					<view class="input-item">
						<text class="label">角色名称</text>
						<input class="input" v-model="formData.name" placeholder="例如：林雅婷" />
					</view>

					<view class="input-item">
						<text class="label">角色年龄</text>
						<input class="input" v-model="formData.age" placeholder="例如：18 (留空默认未知)" type="number" />
					</view>

					<view class="input-item">
						<text class="label">角色性别</text>
						<scroll-view scroll-x class="chips-scroll">
							<view class="chips-flex">
								<view v-for="item in OPTIONS.gender" :key="item" class="chip"
									:class="{active: formData.gender === item}" @click="formData.gender = item">
									{{item}}
								</view>
							</view>
						</scroll-view>
					</view>

					<view class="sub-group">
						<view class="sub-header" @click="toggleSubSection('charRooms')">
							<text class="sub-title">🏠 房屋室内场景 (房间)</text>
							<text class="sub-arrow">{{ subSections.charRooms ? '▼' : '▶' }}</text>
						</view>

						<view v-show="subSections.charRooms" class="sub-content">
							<view class="setting-tip">自定义家中的房间。玩家在这些房间内移动时，会自动判定为在室内移动（面对面）。</view>

							<view class="input-item">
								<text class="label">添加房间</text>
								<view style="display: flex; gap: 10rpx;">
									<input class="input" style="flex: 1;" v-model="newRoomName"
										placeholder="输入房间名 (如: 秘密地下室)" @confirm="addHomeRoom" />
									<button class="gen-btn"
										style="margin: 0; line-height: 80rpx; border-radius: 10rpx; height: 80rpx;"
										@click="addHomeRoom">添加</button>
								</view>
							</view>

							<view class="input-item" style="margin-bottom: 0;">
								<text class="label">当前拥有的房间 (点击删除)</text>
								<view class="quick-tags">
									<view v-for="(room, idx) in formData.homeRooms" :key="idx" class="tag"
										style="background-color: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9;"
										@click="removeHomeRoom(idx)">
										{{ room }} ✕
									</view>
									<view v-if="formData.homeRooms.length === 0" style="font-size: 24rpx; color: #999;">
										暂无房间，请添加</view>
								</view>
							</view>
						</view>
					</view>

					<view class="sub-group">
						<view class="sub-header" @click="toggleSubSection('charWorld')">
							<text class="sub-title">🌍 所属世界与身份</text>
							<text class="sub-arrow">{{ subSections.charWorld ? '▼' : '▶' }}</text>
						</view>
						<view v-show="subSections.charWorld" class="sub-content">
							<view class="input-item">
								<text class="label">选择世界</text>
								<picker mode="selector" :range="worldList" range-key="name" :value="worldIndex"
									@change="handleWorldChange">
									<view class="picker-box">
										{{ selectedWorld ? selectedWorld.name : '🌐 默认/未选择 (点击选择)' }}
									</view>
								</picker>
								<view v-if="selectedWorldIdentityTemplate" class="tip">
									默认身份：{{ selectedWorldIdentityTemplate.identity || '未设定' }}，
									默认住址：{{ selectedWorldIdentityTemplate.address || '未设定' }}
								</view>
							</view>
							<view class="textarea-item">
								<text class="label">🌍 世界观法则 (Lore)</text>
								<view class="tips-text" style="font-size:22rpx; color:#999; margin-bottom:10rpx;">
									定义这个世界的物理规则、魔法体系、社会常识。
								</view>
								<textarea class="textarea" style="height: 180rpx;" v-model="formData.worldLore"
									placeholder="例：这是一个赛博朋克世界，财阀统治一切..." maxlength="-1" />
							</view>
							<template v-if="selectedWorld">
								<template v-if="selectedResidentialZones.length">
									<view class="input-item">
										<text class="label">住宅区</text>
										<picker mode="selector" :range="selectedResidentialZones" range-key="name"
											:value="residenceZoneIndex" @change="handleResidenceZoneChange">
											<view class="picker-box">{{ selectedResidenceZoneLabel }}</view>
										</picker>
										<view class="tip">私人住宅只能拜访，不能直接闯入。</view>
									</view>
									<view class="input-item">
										<text class="label">门牌号</text>
										<picker mode="selector" :range="availableResidenceUnits" range-key="label"
											:value="residenceUnitIndex" @change="handleResidenceUnitChange">
											<view class="picker-box">{{ selectedResidenceUnitLabel }}</view>
										</picker>
										<view class="quick-tags" v-if="availableResidenceUnits.length">
											<view v-for="(unit, idx) in availableResidenceUnits" :key="unit.id || idx" class="tag"
												@click="selectResidenceUnit(unit.id)">
												{{ unit.label }}
											</view>
										</view>
										<view v-else class="tip">当前住宅区没有可用门牌号，请更换住宅区或去世界观里补充住址。</view>
									</view>
									<view class="input-item">
										<text class="label">当前住址</text>
										<view class="picker-box">{{ formData.location || '尚未选择住址' }}</view>
									</view>
								</template>
								<template v-else>
									<view class="input-item">
										<text class="label">居住地址</text>
										<input class="input" v-model="formData.location" placeholder="输入地址" />
										<view class="quick-tags" v-if="selectedWorldLocationNames.length">
											<view v-for="(loc, idx) in selectedWorldLocationNames" :key="idx" class="tag"
												@click="formData.location = loc">{{ loc }}</view>
										</view>
									</view>
								</template>
								<view class="input-item">
									<text class="label">职业身份</text>
									<input class="input" v-model="formData.occupation" placeholder="输入职业" />
									<view class="quick-tags" v-if="selectedWorldProfessionNames.length">
										<view v-for="(job, idx) in selectedWorldProfessionNames" :key="idx"
											class="tag job-tag" @click="formData.occupation = job">{{ job }}</view>
									</view>
								</view>
							</template>
						</view>
					</view>

					<view class="sub-group">
						<view class="sub-header" @click="toggleSubSection('charLooks')">
							<text class="sub-title">💃 详细特征 (自定义捏人)</text>
							<text class="sub-arrow">{{ subSections.charLooks ? '▼' : '▶' }}</text>
						</view>

						<view v-show="subSections.charLooks" class="sub-content">

							<view class="category-block">
								<text class="block-title">A. 头部特征</text>

								<view class="feature-row">
									<text class="feat-label">画风/面貌 (Face Style)</text>

									<view class="input-row">
										<input class="mini-input-text" v-model="formData.faceStyle"
											placeholder="例: sharp eyes, smug smile (自信吊眼)" />
									</view>

									<view class="tip"
										style="margin-bottom: 12rpx; font-size: 22rpx; color: #666; line-height: 1.5; background: #f9f9f9; padding: 12rpx; border-radius: 8rpx;">
										<view class="tip"
											style="margin-bottom: 12rpx; font-size: 22rpx; color: #666; line-height: 1.5; background: #f9f9f9; padding: 12rpx; border-radius: 8rpx;">
											<text style="font-weight: bold; color: #333;">💡 自定义指南 (英文词汇)：</text><br />
											👀 <text style="color:#007aff;">眼型：</text> tsurime (吊眼), tareme (下垂眼),
											sanpaku (三白眼), slit pupils (竖瞳)<br />
											✨ <text style="color:#007aff;">气质：</text> shy (害羞), gloomy (阴郁/黑眼圈),
											arrogant (傲慢), gentle (温柔), expressionless (无表情)
										</view>
									</view>

									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="(tags, key) in FACE_STYLES_MAP" :key="key"
												class="chip style-chip" :class="{active: formData.faceStyle === key}"
												@click="formData.faceStyle = key">
												{{ getStyleLabel(key) }}
											</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">发色</text>
									<input class="mini-input-text" v-model="formData.charFeatures.hairColor"
										placeholder="输入发色 (如: 渐变粉色)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.hairColor" :key="item" class="chip"
												:class="{active: formData.charFeatures.hairColor === item}"
												@click="setFeature('char', 'hairColor', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">发型</text>
									<input class="mini-input-text" v-model="formData.charFeatures.hairStyle"
										placeholder="输入发型 (如: 侧马尾)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.hairStyle" :key="item" class="chip"
												:class="{active: formData.charFeatures.hairStyle === item}"
												@click="setFeature('char', 'hairStyle', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">瞳色/眼型</text>
									<input class="mini-input-text" v-model="formData.charFeatures.eyeColor"
										placeholder="输入眼瞳 (如: 星星眼)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.eyeColor" :key="item" class="chip"
												:class="{active: formData.charFeatures.eyeColor === item}"
												@click="setFeature('char', 'eyeColor', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>
							</view>

							<view class="category-block">
								<text class="block-title">B. 上身穿搭 (Top)</text>
								<view class="feature-row">
									<text class="feat-label">穿衣模式</text>
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.wearStatus" :key="item" class="chip" :class="{
                                                                  'active': formData.charFeatures.wearStatus === item,
                                                                  'chip-warn': item === '暴露/H' 
                                                              }" @click="setFeature('char', 'wearStatus', item)">
												{{item}}
											</view>
										</view>
									</scroll-view>
								</view>
								<view class="feature-row">
									<text class="feat-label">上衣颜色</text>
									<input class="mini-input-text" v-model="formData.charFeatures.topColor"
										placeholder="自定义颜色" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.clothingColor" :key="item" class="chip"
												:class="{active: formData.charFeatures.topColor === item}"
												@click="setFeature('char', 'topColor', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">上衣款式</text>
									<input class="mini-input-text" v-model="formData.charFeatures.topStyle"
										placeholder="输入款式 (如: 露脐T恤)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.topStyle" :key="item" class="chip"
												:class="{active: formData.charFeatures.topStyle === item}"
												@click="setFeature('char', 'topStyle', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">皮肤状态</text>
									<input class="mini-input-text" v-model="formData.charFeatures.skinGloss"
										placeholder="输入状态 (如: 晒痕)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.skinGloss" :key="item" class="chip"
												:class="{active: formData.charFeatures.skinGloss === item}"
												@click="setFeature('char', 'skinGloss', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">胸围</text>
									<input class="mini-input-text" v-model="formData.charFeatures.chestSize"
										placeholder="输入尺寸" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.chestSize" :key="item" class="chip"
												:class="{active: formData.charFeatures.chestSize === item}"
												@click="setFeature('char', 'chestSize', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>
							</view>

							<view class="category-block">
								<text class="block-title">C. 下身穿搭 (Bottom)</text>

								<view class="feature-row">
									<text class="feat-label">下装颜色</text>
									<input class="mini-input-text" v-model="formData.charFeatures.bottomColor"
										placeholder="自定义颜色" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.clothingColor" :key="item" class="chip"
												:class="{active: formData.charFeatures.bottomColor === item}"
												@click="setFeature('char', 'bottomColor', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">下装款式</text>
									<input class="mini-input-text" v-model="formData.charFeatures.bottomStyle"
										placeholder="输入款式 (如: 瑜伽裤)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.bottomStyle" :key="item" class="chip"
												:class="{active: formData.charFeatures.bottomStyle === item}"
												@click="setFeature('char', 'bottomStyle', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">腿部/袜子</text>
									<input class="mini-input-text" v-model="formData.charFeatures.legWear"
										placeholder="输入款式 (如: 腿环)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.legWear" :key="item" class="chip"
												:class="{active: formData.charFeatures.legWear === item}"
												@click="setFeature('char', 'legWear', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>
							</view>

							<view class="category-block">
								<text class="block-title">D. 身体线条</text>

								<view class="feature-row">
									<text class="feat-label">腰部</text>
									<input class="mini-input-text" v-model="formData.charFeatures.waist"
										placeholder="输入描述 (如: 人鱼线)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.waist" :key="item" class="chip"
												:class="{active: formData.charFeatures.waist === item}"
												@click="setFeature('char', 'waist', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">臀部</text>
									<input class="mini-input-text" v-model="formData.charFeatures.hips"
										placeholder="输入描述 (如: 蜜桃臀)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.hips" :key="item" class="chip"
												:class="{active: formData.charFeatures.hips === item}"
												@click="setFeature('char', 'hips', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">腿型</text>
									<input class="mini-input-text" v-model="formData.charFeatures.legs"
										placeholder="输入描述 (如: 丰满大腿)" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.legs" :key="item" class="chip"
												:class="{active: formData.charFeatures.legs === item}"
												@click="setFeature('char', 'legs', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>
							</view>

							<view class="category-block">
								<text class="block-title" style="color: #ff6b81;">E. dddd</text>

								<view class="feature-row">
									<text class="feat-label">蓓蕾颜色</text>
									<input class="mini-input-text" v-model="formData.charFeatures.nippleColor"
										placeholder="自定义" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.nippleColor" :key="item" class="chip"
												:class="{active: formData.charFeatures.nippleColor === item}"
												@click="setFeature('char', 'nippleColor', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">丛林状态</text>
									<input class="mini-input-text" v-model="formData.charFeatures.pubicHair"
										placeholder="自定义" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.pubicHair" :key="item" class="chip"
												:class="{active: formData.charFeatures.pubicHair === item}"
												@click="setFeature('char', 'pubicHair', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>

								<view class="feature-row">
									<text class="feat-label">花朵形态</text>
									<input class="mini-input-text" v-model="formData.charFeatures.vulvaType"
										placeholder="自定义" />
									<scroll-view scroll-x class="chips-scroll">
										<view class="chips-flex">
											<view v-for="item in OPTIONS.vulvaType" :key="item" class="chip"
												:class="{active: formData.charFeatures.vulvaType === item}"
												@click="setFeature('char', 'vulvaType', item)">{{item}}</view>
										</view>
									</scroll-view>
								</view>
							</view>

							<button class="mini-btn-gen" @click="generateEnglishPrompt">⬇️ 组装并翻译 Prompt</button>
							<view class="textarea-item">
								<text class="label">固定外貌 Prompt (英文 - 将直接用于生图)</text>
								<textarea class="textarea large" v-model="formData.appearance"
									placeholder="1girl, cute face..." maxlength="-1" />
								<view class="tip">Chat页面将直接使用此段 Prompt。</view>
							</view>

							<view class="input-item">
								<view class="label-row">
									<text class="label" style="margin-bottom:0;">头像链接</text>

									<view class="gen-btn" :class="{ 'disabled': isGenerating }" @click="generateAvatar"
										hover-class="gen-btn-hover">
										{{ isGenerating ? loadingText : (imgProvider === 'openai' ? '✨ OpenAI 生成' : '🎨 ComfyUI 生成') }}
									</view>
								</view>
								<input class="input" v-model="formData.avatar" placeholder="输入链接 或 点击上方生成" />
								<view class="avatar-preview-box">
									<image v-if="formData.avatar && formData.avatar.length > 10" :src="formData.avatar"
										class="avatar-preview" mode="aspectFill"></image>
									<view v-else class="avatar-placeholder"><text class="avatar-emoji">📷</text></view>
								</view>
							</view>
						</view>
					</view>


				</view>
			</view>

			<view class="form-section">
				<view class="section-header" @click="toggleSection('player')">
					<view class="section-title-wrapper">
						<view class="section-title" style="color: #2ecc71;">🔗 玩家羁绊 (你)</view>
						<text class="section-subtitle">你与该角色的专属关系</text>
					</view>
					<text class="arrow-icon">{{ activeSections.player ? '▼' : '▶' }}</text>
				</view>

				<view v-show="activeSections.player" class="section-content">
					<view class="setting-tip">💡 提示：你的个人信息（姓名、年龄、住址、外貌等）已统一移至“我的 -> 世界观设定”中管理。同一个世界下的角色将共享你的信息。</view>

					<view class="input-item" style="margin-top: 20rpx;">
						<text class="label">你们的关系 (Relation)</text>
						<input class="input" v-model="formData.userRelation" placeholder="例：青梅竹马 / 合租室友 / 刚认识的邻居" />
					</view>

					<view class="input-item">
						<text class="label">关系原型</text>
						<scroll-view scroll-x class="chips-scroll">
							<view class="chips-flex">
								<view v-for="item in RELATIONSHIP_ARCHETYPE_OPTIONS" :key="item.value" class="chip"
									:class="{active: formData.relationshipArchetype === item.value}"
									@click="formData.relationshipArchetype = item.value">
									{{ item.label }}
								</view>
							</view>
						</scroll-view>
						<view class="tip">不确定时保持“自动”，系统会根据你填写的文字关系和角色身份来推断。</view>
					</view>

					<view class="input-item"
						style="margin-top: 40rpx; background: rgba(255, 107, 129, 0.05); padding: 20rpx; border-radius: 12rpx; border: 1px dashed #ff6b81;">
						<view class="slider-header">
							<text class="label" style="color: #ff4757; font-weight: bold; margin-bottom: 0;">❤️ 初始好感度 /
								羁绊值: {{ formData.affinity }}</text>
						</view>
						<slider :value="formData.affinity" min="0" max="100" step="1" show-value activeColor="#ff4757"
							@change="(e) => formData.affinity = e.detail.value" />
						<view class="tip" style="color: #666;">
							0=极度厌恶/死敌，50=普通/刚认识，100=生死相随/至亲。
							<br />AI 会结合上方的"文字关系"和这里的"数值深度"来决定对你的初始态度。
						</view>
					</view>
				</view>
			</view>

			<view class="form-section">
				<view class="section-header" @click="toggleSection('core')">
					<view class="section-title-wrapper">
						<view class="section-title" style="color: #ff9f43;">核心人设与剧本</view>
						<text class="section-subtitle">选择模板，或者自己编写她的灵魂</text>
					</view>
					<text class="arrow-icon">{{ activeSections.core ? '▼' : '▶' }}</text>
				</view>

				<view v-show="activeSections.core" class="section-content">
					<view class="textarea-item">
						<text class="label">📜 背景故事 / 身份设定 (Bio)</text>
						<textarea class="textarea" v-model="formData.bio" placeholder="例：她是刚搬来的人妻邻居，丈夫常年出差。..."
							maxlength="-1" />
					</view>

					<view class="textarea-item">
						<text class="label">✨ 人物性格 (Personality)</text>
						<textarea class="textarea" style="height:120rpx;" v-model="formData.personality"
							placeholder="例：傲娇、腹黑、温柔、病娇..." maxlength="-1" />
					</view>

					<view class="textarea-item">
						<text class="label">🗣️ 说话风格 / 口癖</text>
						<textarea class="textarea" style="height:120rpx;" v-model="formData.speakingStyle"
							placeholder="例：语气慵懒，喜欢叫人“小弟弟”..." maxlength="-1" />
					</view>

					<view class="input-item">
						<text class="label">❤️ 喜好 (Likes)</text>
						<input class="input" v-model="formData.likes" placeholder="XP系统/喜欢的事物" />
					</view>
					<view class="input-item">
						<text class="label">⚡ 雷点 (Dislikes)</text>
						<input class="input" v-model="formData.dislikes" placeholder="厌恶的行为" />
					</view>

					<view class="input-item"
						style="margin-top: 30rpx; padding: 20rpx; background: #e3f2fd; border-radius: 16rpx; border: 1px dashed #2196f3;">
						<view style="text-align: center;">
							<view style="font-size: 28rpx; font-weight: bold; color: #1976d2; margin-bottom: 10rpx;">✨
								AI 行为逻辑生成</view>
							<view style="font-size: 22rpx; color: #666; margin-bottom: 20rpx;">AI 会拆分生成：背景扩充 +
								随关系变化的动态偏置。</view>
							<button @click="autoGenerateBehavior"
								style="background: #2196f3; color: white; font-size: 26rpx; border-radius: 40rpx; width: 80%;">🚀
								生成背景 + 动态</button>
						</view>
					</view>

					<view class="input-item"
						style="margin-top: 30rpx; padding: 24rpx; background: #f4fbf6; border-radius: 16rpx; border: 1px solid #b9e7c5;">
						<view class="slider-header" style="align-items: flex-start;">
							<view style="flex: 1; padding-right: 20rpx;">
								<text class="label"
									style="margin-bottom: 8rpx; color: #1f7a3d; font-weight: 600;">启用 AI</text>
								<view class="tip">让这个角色的日常生活行为使用更强的 AI 决策；关闭时继续使用轻量居民模拟。</view>
								<view class="tip">只影响小镇中的生活行为，不影响正常聊天、头像生成或角色设定生成。</view>
							</view>
							<switch
								:checked="formData.behaviorMode === 'agent'"
								color="#2ecc71"
								@change="(event) => formData.behaviorMode = event.detail.value ? 'agent' : 'lightweight'" />
						</view>
					</view>

					<view class="textarea-item" style="margin-top: 20rpx;">
						<text class="label">🧠 背景扩充 (Background Expansion - 补充世界观与设定)</text>
						<view class="help-text">写“背景补充”：补充世界观细节、过去经历、生活习惯等。</view>
						<textarea class="textarea large" style="height: 240rpx;" v-model="formData.personalityCore"
							placeholder="例：她出生在古老的魔法世家；曾经因为一次实验事故失去了魔力..." maxlength="-1" />
					</view>

					<view class="textarea-item" style="margin-top: 20rpx;">
						<text class="label">🧩 关系动态偏置 (Dynamic Bias - 会随关系变化)</text>
						<view class="help-text">写“对玩家的亲疏尺度/语气/边界策略”：陌生/暧昧/恋人/冷战时分别如何互动。必须声明不违反核心。</view>
						<textarea class="textarea large" style="height: 240rpx;" v-model="formData.personalityDynamic"
							placeholder="例：陌生人保持距离；暧昧会试探但不越界；恋人私下更亲密但工作优先..." maxlength="-1" />
					</view>

					<view class="textarea-item" style="margin-top: 30rpx;">
						<text class="label" style="color: #e74c3c;">💔 软肋与性格缺陷 (Flaws)</text>
						<view class="help-text">完美的角色像假人。给她设定一些缺点、不擅长的事或性格瑕疵，她会更真实。</view>
						<textarea class="textarea" style="height:120rpx;" v-model="formData.flaws"
							placeholder="例：死鸭子嘴硬、重度路痴、极度缺乏安全感很容易吃醋..." maxlength="-1" />
					</view>

					<view class="textarea-item">
						<text class="label" style="color: #8e44ad;">🎭 反差面与小秘密 (Secrets)</text>
						<view class="help-text">她对外隐藏的一面是什么？（只有亲密的人才能发现的特质）</view>
						<textarea class="textarea" style="height:120rpx;" v-model="formData.secret"
							placeholder="例：白天是冰山女总裁，私下其实极度怕黑，睡觉要抱着小熊..." maxlength="-1" />
					</view>

					<view class="input-item">
						<text class="label" style="color: #d35400;">⚔️ 吵架/冲突处理模式</text>
						<view class="help-text">当她生气、委屈或遇到分歧时，她的本能反应是什么？(禁止AI一味道歉)</view>
						<scroll-view scroll-x class="chips-scroll">
							<view class="chips-flex">
								<view class="chip" :class="{active: formData.conflictMode === '冷战回避(不理人)'}"
									@click="formData.conflictMode = '冷战回避(不理人)'">冷战回避(不理人)</view>
								<view class="chip" :class="{active: formData.conflictMode === '阴阳怪气(翻旧账)'}"
									@click="formData.conflictMode = '阴阳怪气(翻旧账)'">阴阳怪气(翻旧账)</view>
								<view class="chip" :class="{active: formData.conflictMode === '委屈大哭(需安慰)'}"
									@click="formData.conflictMode = '委屈大哭(需安慰)'">委屈大哭(需安慰)</view>
								<view class="chip" :class="{active: formData.conflictMode === '傲娇嘴硬(等台阶)'}"
									@click="formData.conflictMode = '傲娇嘴硬(等台阶)'">傲娇嘴硬(等台阶)</view>
							</view>
						</scroll-view>
						<input class="input" style="margin-top: 10rpx;" v-model="formData.conflictMode"
							placeholder="或者自定义应激反应" />
					</view>
				</view>
			</view>

			<view class="form-section">
				<view class="form-section">
					<view class="section-header" @click="toggleSection('memory_manage')">
						<view class="section-title-wrapper">
							<view class="section-title" style="color: #9b59b6;">记忆与日记管理</view>
							<text class="section-subtitle">查看她的秘密日记</text>
						</view>
						<text class="arrow-icon">{{ activeSections.memory_manage ? '▼' : '▶' }}</text>
					</view>

					<view v-show="activeSections.memory_manage" class="section-content">
						<view class="input-item" style="background:#e3f2fd; padding:15rpx; border-radius:12rpx;">
							<view class="slider-header">
								<text class="label" style="color:#007aff; font-weight:bold;">🧠 最近印象 (Active):
									{{ formData.activeMemoryDays }} 天</text>
							</view>
							<slider :value="formData.activeMemoryDays" min="0" max="7" step="1" show-value
								activeColor="#007aff" @change="(e) => formData.activeMemoryDays = e.detail.value" />
							<view class="tip" style="color:#666;">这几天的回忆大纲会<text
									style="font-weight:bold; color:#007aff">始终</text>包含在对话背景里，直接影响她的当下语气。</view>
						</view>

						<view class="input-item"
							style="margin-top:20rpx; background:#f3e5f5; padding:15rpx; border-radius:12rpx;">
							<view class="slider-header">
								<text class="label" style="color:#9b59b6; font-weight:bold;">📚 往事检索范围 (Passive):
									{{ formData.diaryHistoryLimit }} 天</text>
							</view>
							<slider :value="formData.diaryHistoryLimit" min="7" max="60" step="1" show-value
								activeColor="#9b59b6" @change="(e) => formData.diaryHistoryLimit = e.detail.value" />
							<view class="tip" style="color:#666;">当你问起很久以前的事时，她会在这个范围内进行搜索和回忆。</view>
						</view>

						<view class="diary-list" style="margin-top: 40rpx;">
							<text class="label" style="margin-bottom: 20rpx; display: block;">📖 往事日记本
								({{ diaryList.length }})</text>

							<view v-if="diaryList.length === 0" class="empty-tip"
								style="text-align:center; color:#999; padding:20rpx; font-size: 24rpx;">
								暂无日记，去和她多聊聊天吧~
							</view>

							<view v-for="(log, index) in diaryList" :key="index" class="diary-item"
								style="background:#fff; padding:20rpx; margin-bottom:16rpx; border-radius:12rpx; border:1px solid #eee;"
								@click="log.expanded = !log.expanded" @longpress="handleDeleteDiary(log, index)">

								<view class="diary-header"
									style="display:flex; justify-content:space-between; align-items:center;">
									<text class="diary-date"
										style="font-size:24rpx; color:#999;">{{ log.dateStr }}</text>
									<text class="diary-mood"
										style="font-size:24rpx; background:#f0f0f0; padding:2rpx 10rpx; border-radius:8rpx;">{{ log.mood || '❤️' }}</text>
								</view>

								<view class="diary-brief"
									style="font-size:28rpx; font-weight:bold; margin:10rpx 0; color:#333;">
									{{ log.brief }}
								</view>

								<view v-if="log.expanded" class="diary-detail"
									style="margin-top:16rpx; padding-top:16rpx; border-top:1px dashed #eee; font-size:26rpx; color:#555; line-height:1.6;">
									{{ log.detail }}
								</view>

								<view v-else style="text-align:center;">
									<text style="font-size:20rpx; color:#ccc;">▼ 点击展开详情</text>
								</view>
							</view>
						</view>
					</view>
				</view>
				<view class="section-header" @click="toggleSection('memory')">
					<view class="section-title-wrapper">
						<view class="section-title" style="color: #9b59b6;">记忆增强</view>
					</view>
					<text class="arrow-icon">{{ activeSections.memory ? '▼' : '▶' }}</text>
				</view>
				<view v-show="activeSections.memory" class="section-content">
					<view class="input-item">
						<view class="slider-header"><text class="label">上下文深度 (History Limit):
								{{ formData.historyLimit }}</text></view>
						<slider :value="formData.historyLimit" min="10" max="60" step="2" show-value
							activeColor="#9b59b6" @change="(e) => formData.historyLimit = e.detail.value" />
						<view class="tip">控制AI能“看到”的最近聊天记录条数。</view>
					</view>

					<view class="input-item"
						style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #eee; padding-top:20rpx; margin-top:20rpx;">
						<text class="label" style="margin-bottom:0;">开启长期记忆自动总结</text>
						<switch :checked="formData.enableSummary"
							@change="(e) => formData.enableSummary = e.detail.value" color="#9b59b6" />
					</view>
					<template v-if="formData.enableSummary">
						<view class="input-item">
							<view class="slider-header"><text class="label">总结频率: {{ formData.summaryFrequency }}</text>
							</view>
							<slider :value="formData.summaryFrequency" min="10" max="50" step="5" show-value
								activeColor="#9b59b6" @change="(e) => formData.summaryFrequency = e.detail.value" />
						</view>
						<view class="textarea-item">
							<view class="slider-header"><text class="label">当前长期记忆摘要</text><text class="tip"
									style="color:#9b59b6;" @click="formData.summary = ''">清空</text></view>
							<textarea class="textarea large memory-box" v-model="formData.summary" maxlength="-1" />
						</view>
					</template>
				</view>
			</view>

			<view class="form-section">
				<view class="section-header" @click="toggleSection('economy')">
					<view class="section-title-wrapper">
						<view class="section-title" style="color: #f1c40f;">💰 经济与金钱系统</view>
						<text class="section-subtitle">管理双方的钱包与收入</text>
					</view>
					<text class="arrow-icon">{{ activeSections.economy ? '▼' : '▶' }}</text>
				</view>

				<view v-show="activeSections.economy" class="section-content">
					<view class="input-item"
						style="display: flex; justify-content: space-between; align-items: center; background: #fffde7; padding: 20rpx; border-radius: 12rpx; border: 1px solid #fff59d;">
						<text class="label" style="margin-bottom:0; color: #f57f17; font-weight: bold;">是否共享共同财产</text>
						<switch :checked="formData.economy.isSharedWallet"
							@change="(e) => formData.economy.isSharedWallet = e.detail.value" color="#f1c40f" />
					</view>
					<view class="tip" style="margin-bottom: 30rpx;">开启后，两人的钱加在一起算作共同财产（买东西扣总金额）；关闭则各自花各自的。</view>

					<view class="input-item">
						<text class="label">玩家钱包 (初始金额)</text>
						<input class="input" type="number" v-model="formData.economy.userWallet"
							placeholder="例如：1000" />
					</view>

					<view class="input-item">
						<text class="label">角色钱包 (初始金额)</text>
						<input class="input" type="number" v-model="formData.economy.charWallet"
							placeholder="例如：1000" />
					</view>

					<view class="input-item">
						<text class="label">角色每日收入 (零花钱/工资)</text>
						<input class="input" type="number" v-model="formData.economy.dailyIncome"
							placeholder="例如：100" />
						<view class="tip">随着游戏时间跨天，角色每天会自动存入钱包的金额。</view>
					</view>
				</view>
			</view>

			<view class="form-section" v-if="isEditMode">
				<view class="section-header" @click="toggleSection('danger')">
					<view class="section-title" style="color: #ff4757;">危险区域</view>
					<text class="arrow-icon">{{ activeSections.danger ? '▼' : '▶' }}</text>
				</view>
				<view v-show="activeSections.danger" class="section-content">
					<button class="clear-btn" @click="clearHistoryAndReset">清空聊天记录 & 重置位置/模式/状态</button>
				</view>
			</view>

			<view style="height: 150rpx;"></view>
		</scroll-view>

		<view class="bottom-area">
			<button class="save-btn" @click="saveCharacter">{{ isEditMode ? '保存修改' : '立即创建' }}</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue';
	import {
		onLoad,
		onShow
	} from '@dcloudio/uni-app';
	import {
		characterService
	} from '@/services/characterService.js';
	import {
		useCharacterStore
	} from '@/stores/useCharacterStore.js';
	import { worldTemplateService } from '@/services/worldTemplateService.js';
	import {
		DB
	} from '@/utils/db.js';
	// 引入常量
	import {
		FACE_STYLES_MAP,
		FACE_LABELS
	} from '@/utils/constants.js';
	// 引入逻辑 Hook
	import {
		useCharacterCreate
	} from '@/composables/useCharacterCreate.js';
	import {
		IMAGE_GENERATOR_OPENAI_PROMPT
	} from '@/utils/prompts.js';
	import {
		LLM,
		getCurrentLlmConfig
	} from '@/services/llm.js';
	import {
		saveToGallery
	} from '@/utils/gallery-save.js';
	import {
		buildAvailableResidenceUnits,
		buildResidenceLabel,
		buildResidenceLocationId
	} from '@/utils/town/town-location-access.js';
	import {
		buildRelationshipFieldsFromForm,
		createRelationshipFormDraft
	} from '@/utils/town/player-relationship-form.js';
	import {
		createResidentAutonomyRuntime,
		resolveResidentBehaviorMode
	} from '@/utils/town/town-resident-autonomy.js';
	const imgProvider = ref('comfyui');
	import {
		useTheme
	} from '@/composables/useTheme.js';
	const {
		isDarkMode,
		applyNativeTheme
	} = useTheme();
	const characterStore = useCharacterStore();
	// =========================================================================
	// 1. 常量定义 (UI 选项保留在页面内是没问题的)
	// =========================================================================
	const OPTIONS = {
		gender: ['女', '男', '其他'], // ✨ 新增：角色性别选项
		hairColor: ['黑色', '银白', '金色', '粉色', '红色', '蓝色', '紫色', '棕色'],
		hairStyle: ['长直发', '大波浪', '双马尾', '短发', '姬发式', '丸子头', '单马尾', '凌乱发'],
		eyeColor: ['红色', '蓝色', '金色', '绿色', '紫色', '黑色', '异色'],
		wearStatus: ['正常穿戴', '暴露/H'],

		topStyle: ['T恤', '衬衫', '毛衣', '吊带背心', '抹胸', '比基尼上衣', '运动内衣', '水手服上衣', '旗袍上身', '透视衫'],
		bottomStyle: ['百褶裙', '牛仔短裤', '瑜伽裤', '包臀裙', '比基尼泳裤', '蕾丝内裤', '丁字裤(T-back)', '开档内裤', '运动短裤', '牛仔长裤'],

		clothingColor: ['白色', '黑色', '粉色', '蓝色', '红色', '紫色', '黑白相间'],
		legWear: ['光腿', '白丝袜', '黑丝袜', '网眼袜', '过膝袜', '短袜', '腿环'],
		skinGloss: ['自然哑光', '柔嫩白皙', '水润微光', '油亮光泽', '汗湿淋漓', '晒痕'],
		chestSize: ['贫乳(Flat)', '微乳(Small)', '丰满(Medium)', '巨乳(Large)', '爆乳(Huge)'],

		nippleColor: ['淡粉色', '粉红', '红润', '深褐色', '肿胀'],
		waist: ['纤细腰身', '柔软腰肢', '丰满腰臀', '马甲线', '人鱼线'],
		hips: ['丰满圆润', '挺翘', '安产型宽胯', '肉感'],
		legs: ['纤细长腿', '肉感大腿', '筷子腿', '肌肉线条'],

		pubicHair: ['白虎(无毛)', '一线天', '修剪整齐', '自然茂盛', '爱心形状'],
		vulvaType: ['馒头型(饱满)', '粉嫩(Pink)', '紧致', '湿润(Wet)', '蝴蝶型(外翻)'],

		maleHair: ['黑色短发', '棕色碎发', '寸头', '中分', '狼尾', '遮眼发'],
		maleBody: ['身材匀称', '肌肉结实', '清瘦', '略胖', '高大威猛', '腹肌明显'],
		malePrivate: ['干净无毛', '修剪整齐', '浓密自然', '尺寸惊人', '青筋暴起']
	};

	const RELATIONSHIP_ARCHETYPE_OPTIONS = [{
			value: 'auto',
			label: '自动'
		},
		{
			value: 'family',
			label: '家人'
		},
		{
			value: 'neighbor',
			label: '邻里'
		},
		{
			value: 'classmate_or_coworker',
			label: '同学/同事'
		},
		{
			value: 'service',
			label: '服务关系'
		},
		{
			value: 'friend_like',
			label: '朋友向'
		},
		{
			value: 'special',
			label: '特殊'
		}
	];

	const PERSONALITY_TEMPLATES = {
		'ice_queen': {
			label: '❄️ 高岭之花 (反差)',
			bio: '名门千金或高冷圣女，从小接受严苛教育，认为凡人皆蝼蚁。极其洁身自好，对男性充满鄙视。',
			style: '高雅冷漠，用词考究，偶尔自称“本小姐”或“我”。',
			likes: '红茶，古典音乐，独处，被坚定地选择',
			dislikes: '轻浮的举动，肮脏的地方，被无视',
			logic: '初始态度眼神冰冷，公事公办，拒绝任何非必要交流。口头禅：“离我远点”。随着关系深入，会表现出傲娇和极度的占有欲。'
		},
		'succubus': {
			label: '💗 魅魔 (直球)',
			bio: '依靠吸食精气为生的魅魔。在她眼里，男人只有“食物”的区别。',
			style: '轻浮，撩人，喜欢叫“小哥哥”或“亲爱的”，句尾带波浪号~',
			likes: '精气，帅哥，甜言蜜语，各种Play',
			dislikes: '无趣的男人，禁欲系(除非能吃掉)，说教',
			logic: '热情奔放，把玩家当猎物，言语露骨。如果玩家顺从，会进一步索取；如果玩家拒绝，会觉得有趣并加大攻势。'
		},
		'neighbor': {
			label: '☀️ 青梅竹马 (纯爱)',
			bio: '从小一起长大的邻家女孩。经常损你，但其实暗恋你很久了。',
			style: '大大咧咧，活泼，像哥们一样，喜欢吐槽。',
			likes: '打游戏，奶茶，漫画，和你待在一起',
			dislikes: '你被别人抢走，复杂的算计，恐怖片',
			logic: '像哥们一样相处，没有性别界限感，互相吐槽。当涉及恋爱话题时会害羞、转移话题。非常护短。'
		},
		'boss': {
			label: '👠 女上司 (S属性)',
			bio: '雷厉风行的女强人上司。性格强势，看不起软弱的男人。',
			style: '简短有力，命令式语气，冷嘲热讽。',
			likes: '工作效率，服从，咖啡，掌控感',
			dislikes: '迟到，借口，软弱，违抗',
			logic: '极度严厉，把玩家当工具人。喜欢下达命令并期待服从。对于反抗会感到愤怒或被激起征服欲。'
		}
	};

	// =========================================================================
	// 2. 状态管理 (必须先定义这些，才能传给 useCharacterCreate)
	// =========================================================================

	const isEditMode = ref(false);
	const targetId = ref(null);
	const currentTemplateKey = ref('');

	// 界面折叠状态
	const activeSections = ref({
		basic: false,
		player: false,
		core: false,
		init: false,
		memory: false,
		danger: false,
		economy: false,
	});
	const toggleSection = (key) => {
		activeSections.value[key] = !activeSections.value[key];
	};

	const subSections = ref({
		charWorld: false,
		charRooms: false,
		charLooks: false,
		userWorld: false,
		userLooks: false
	});
	const toggleSubSection = (key) => {
		subSections.value[key] = !subSections.value[key];
	};

	const worldList = ref([]);
	const worldResidents = ref([]);
	const worldIndex = ref(-1);
	const userWorldIndex = ref(-1);
	const diaryList = ref([]);
	const initialRelationshipDraft = createRelationshipFormDraft();
	const formData = ref({
		// --- 基础信息 ---
		name: '',
		gender: '女',
		age: '',
		avatar: '',
		bio: '',
		personality: '', // ✨ 新增 personality
		worldId: '',
		residenceZoneId: '',
		residenceUnitId: '',
		location: '',
		occupation: '',
		worldLore: '',
		behaviorMode: 'lightweight',


		diaryHistoryLimit: 30, // 默认检索 30 天
		activeMemoryDays: 3, // ✨ 新增：默认记住最近 3 天
		// --- 核心外貌数据 ---
		appearance: '',
		appearanceSafe: '',
		appearanceNsfw: '',

		faceStyle: 'cute',
		charFeatures: {
			hairColor: '',
			hairStyle: '',
			eyeColor: '',
			wearStatus: '正常穿戴',
			topColor: '',
			topStyle: '',
			bottomColor: '',
			bottomStyle: '',
			legWear: '',
			skinGloss: '',
			chestSize: '',
			nippleColor: '',
			waist: '',
			hips: '',
			legs: '',
			pubicHair: '',
			vulvaType: ''
		},

		// workplace: '',
		// workStartHour: 9,
		// workEndHour: 18,
		// workDays: [1, 2, 3, 4, 5],
		homeRooms: ['客厅', '卧室', '厨房', '卫生间'],
		speakingStyle: '',
		likes: '',
		dislikes: '',
		flaws: '', // ✨ 新增：缺点/软肋
		secret: '', // ✨ 新增：隐藏的反差/秘密
		conflictMode: '', // ✨ 新增：吵架/应激反应
		personalityCore: '',
		personalityDynamic: '',
		personalityNormal: '',
		evolutionLevel: 1, // ✨ 新增：进化等级

		userRelation: initialRelationshipDraft.userRelation,
		affinity: initialRelationshipDraft.affinity,
		relationshipArchetype: initialRelationshipDraft.relationshipArchetype,
		
		maxReplies: 1,


		allowProactive: false,
		proactiveInterval: 4,
		proactiveNotify: false,

		historyLimit: 20,
		enableSummary: false,
		summaryFrequency: 20,
		summary: '',
		// 经济系统默认数据
		economy: {
			isSharedWallet: false,
			userWallet: 1000,
			charWallet: 1000,
			dailyIncome: 100
		}
	});
	const newRoomName = ref('');
	const addHomeRoom = () => {
		const name = newRoomName.value.trim();
		if (!name) return;
		if (formData.value.homeRooms.includes(name)) {
			return uni.showToast({
				title: '房间已存在',
				icon: 'none'
			});
		}
		formData.value.homeRooms.push(name);
		newRoomName.value = '';
	};
	const removeHomeRoom = (idx) => {
		formData.value.homeRooms.splice(idx, 1);
	};
	onShow(() => {

		applyNativeTheme();
		loadWorldTemplates();
		syncWorldIndexes();
		if (formData.value.worldId) {
			loadWorldResidents(formData.value.worldId).then(() => {
				if (selectedWorld.value) {
					applyWorldDefaults(selectedWorld.value, true);
				}
			});
		} else {
			worldResidents.value = [];
		}


	});
	// 1. 敏感词清洗
	const sanitizePrompt = (text) => {
		if (!text) return "";
		let cleanText = text;
		cleanText = cleanText.replace(/\bmilf\b/gi, "mature elegant lady");
		cleanText = cleanText.replace(/\b(nude|naked|nipples?|pussy|penis|vagina|sex|fuck)\b/gi, "");
		cleanText = cleanText.replace(/\b(t-back|thong|g-string)\b/gi, "lace lingerie");
		cleanText = cleanText.replace(/\b(sheer|transparent|see-through)\b/gi, "delicate silk");
		cleanText = cleanText.replace(/\b(open crotch|crotchless)\b/gi, "");
		cleanText = cleanText.replace(/\bhuge breasts\b/gi, "voluptuous figure");
		cleanText = cleanText.replace(/\blarge breasts\b/gi, "curvy body");
		cleanText = cleanText.replace(/\b(cleavage|areola)\b/gi, "neckline");
		return cleanText;
	};

	// 2. 画风前缀
	const getOpenAIStylePrefix = (styleValue) => {
		if (!styleValue || styleValue === 'anime') return "High-quality anime style illustration of";
		const map = {
			'impasto': "Anime style illustration with rich colors and painterly brushstrokes, detailed shading of",
			'retro': "Retro 90s cel-shaded anime style illustration, vintage aesthetic of",
			'shinkai': "Masterpiece anime illustration with vibrant lighting, clouds and emotional atmosphere in the style of Makoto Shinkai, depicting",
			'ghibli': "Studio Ghibli style animation cell illustration, hand-drawn texture of",
			'gufeng': "Anime style illustration, elegant oriental aesthetics, soft colors, detailed background showing",
			'pastel': "Dreamy soft pastel watercolor anime illustration, delicate lines of",
			'sketch': "High-quality manga sketch, clean lines, intricate details of",
			'realistic': "High-quality 2.5D CG art, semi-realistic anime style with detailed skin texture and cinematic lighting of",
			'cyberpunk': "Cyberpunk style anime digital art, neon lights, futuristic atmosphere of"
		};
		if (map[styleValue]) return map[styleValue];
		return `High-quality anime style illustration with ${styleValue} elements of`;
	};



	/**
	 * 处理长按删除日记
	 * @param {Object} log - 日记对象
	 * @param {number} index - 在当前列表中的索引
	 */
	const handleDeleteDiary = (log, index) => {
		// 震动反馈（增强体验）
		uni.vibrateShort();

		uni.showModal({
			title: '删除日记',
			content: `确定要抹除这段往事吗？\n「${log.brief}」\n删除后将无法恢复，且AI也会忘记这段记忆。`,
			confirmColor: '#ff4757',
			success: async (res) => {
				if (res.confirm) {
					try {
						// 1. 从 SQLite 数据库中物理删除
						// 使用 log.id 作为唯一标识，这个 ID 是在数据库查询时带出来的
						await DB.execute(
							`DELETE FROM diaries WHERE id = ?`,
							[log.id]
						);

						// 2. 从当前页面的响应式列表中移除，实现无感刷新
						diaryList.value.splice(index, 1);

						uni.showToast({
							title: '已从记忆中抹除',
							icon: 'success'
						});

						console.log(`✅ [DB] Diary ID ${log.id} deleted successfully.`);
					} catch (e) {
						console.error('❌ 删除日记失败:', e);
						uni.showToast({
							title: '删除失败',
							icon: 'none'
						});
					}
				}
			}
		});
	};
	// ✨✨✨ 修正位置：必须在 formData 定义之后调用！✨✨✨
	const {
		generateEnglishPrompt,
		generateUserDescription,
		autoGenerateBehavior,
		generateAvatar: generateAvatarComfy
	} = useCharacterCreate(formData, targetId);

	const selectedWorld = computed(() => (worldIndex.value > -1 && worldList.value[worldIndex.value]) ? worldList.value[
		worldIndex.value] : null);
	const selectedUserWorld = computed(() => (userWorldIndex.value > -1 && worldList.value[userWorldIndex.value]) ?
		worldList.value[userWorldIndex.value] : null);
	const selectedWorldIdentityTemplate = computed(() => selectedWorld.value?.playerIdentityTemplates?.[0] || null);
	const selectedWorldLocationNames = computed(() => (selectedWorld.value?.locations || []).map((item) => item.name)
		.filter(Boolean));
	const selectedResidentialZones = computed(() => selectedWorld.value?.residentialZones || []);
	const residenceZoneIndex = computed(() => selectedResidentialZones.value.findIndex((item) => item.id === formData
		.value.residenceZoneId));
	const availableResidenceUnits = computed(() => buildAvailableResidenceUnits({
		worldTemplate: selectedWorld.value || {},
		zoneId: formData.value.residenceZoneId,
		residents: worldResidents.value,
		ignoreResidentId: isEditMode.value && targetId.value ? String(targetId.value) : ''
	}));
	const residenceUnitIndex = computed(() => availableResidenceUnits.value.findIndex((item) => item.id === formData
		.value.residenceUnitId));
	const selectedResidenceZoneLabel = computed(() => residenceZoneIndex.value > -1 ? selectedResidentialZones.value[
		residenceZoneIndex.value]?.name || '选择住宅区' : '选择住宅区');
	const selectedResidenceUnitLabel = computed(() => residenceUnitIndex.value > -1 ? availableResidenceUnits.value[
		residenceUnitIndex.value]?.label || '选择门牌号' : '选择门牌号');
	const selectedWorldProfessionNames = computed(() => (selectedWorld.value?.professions || []).map((item) => item
		.name).filter(Boolean));

	const loadWorldTemplates = () => {
		worldList.value = worldTemplateService.ensureDefaultWorldTemplate();
	};
	const loadWorldResidents = async (worldId) => {
		if (!worldId) {
			worldResidents.value = [];
			return worldResidents.value;
		}

		worldResidents.value = await characterService.getCharactersByWorldId(worldId);
		return worldResidents.value;
	};
	const syncResidenceSelection = ({ preserveExisting = false } = {}) => {
		const world = selectedWorld.value;
		if (!world) {
			formData.value.residenceZoneId = '';
			formData.value.residenceUnitId = '';
			return;
		}

		const zones = world.residentialZones || [];
		if (!zones.length) {
			formData.value.residenceZoneId = '';
			formData.value.residenceUnitId = '';
			if (!preserveExisting || !formData.value.location) {
				formData.value.location = '';
			}
			return;
		}

		const ignoreResidentId = isEditMode.value && targetId.value ? String(targetId.value) : '';
		let zoneId = formData.value.residenceZoneId;
		let units = buildAvailableResidenceUnits({
			worldTemplate: world,
			zoneId,
			residents: worldResidents.value,
			ignoreResidentId
		});

		if (!zoneId || !units.length) {
			const firstAvailable = zones.map((zone) => ({
				zoneId: zone.id,
				units: buildAvailableResidenceUnits({
					worldTemplate: world,
					zoneId: zone.id,
					residents: worldResidents.value,
					ignoreResidentId
				})
			})).find((entry) => entry.units.length > 0);

			if (!firstAvailable) {
				formData.value.residenceZoneId = zones[0]?.id || '';
				formData.value.residenceUnitId = '';
				formData.value.location = '';
				return;
			}

			zoneId = firstAvailable.zoneId;
			units = firstAvailable.units;
		}

		let unitId = formData.value.residenceUnitId;
		if (!preserveExisting || !units.some((unit) => unit.id === unitId)) {
			unitId = units[0]?.id || '';
		}

		formData.value.residenceZoneId = zoneId;
		formData.value.residenceUnitId = unitId;
		formData.value.location = buildResidenceLabel(world, {
			zoneId,
			unitId
		}) || '';
	};

	const syncWorldIndexes = () => {
		worldIndex.value = formData.value.worldId ?
			worldList.value.findIndex((w) => String(w.id) === String(formData.value.worldId)) : -1;
		userWorldIndex.value = formData.value.userWorldId ?
			worldList.value.findIndex((w) => String(w.id) === String(formData.value.userWorldId)) : -1;
	};

	const applyWorldDefaults = (world, preserveExisting = false) => {
		if (!world) return;

		formData.value.worldId = world.id || '';

		if (!preserveExisting || !formData.value.worldLore) {
			formData.value.worldLore = world.lore || '';
		}

		const identityTemplate = world.playerIdentityTemplates?.[0];
		if ((world.residentialZones || []).length > 0) {
			syncResidenceSelection({
				preserveExisting
			});
			return;
		}

		if (identityTemplate) {
			if (!preserveExisting || !formData.value.location) {
				formData.value.location = identityTemplate.address || '';
			}
		}
	};

	const getStyleLabel = (key) => FACE_LABELS[key] || key;

	const setFeature = (type, key, value) => {
		if (type === 'char') formData.value.charFeatures[key] = value;
		else formData.value.userFeatures[key] = value;
	};

	const weekDayOptions = [{
			label: '一',
			value: 1
		}, {
			label: '二',
			value: 2
		}, {
			label: '三',
			value: 3
		},
		{
			label: '四',
			value: 4
		}, {
			label: '五',
			value: 5
		}, {
			label: '六',
			value: 6
		}, {
			label: '日',
			value: 0
		}
	];

	const toggleWorkDay = (val) => {
		const idx = formData.value.workDays.indexOf(val);
		if (idx > -1) formData.value.workDays.splice(idx, 1);
		else formData.value.workDays.push(val);
	};

	const isGenerating = ref(false);
	const loadingText = ref('生成中...');

	// 1. 🧠 LLM 提示词工程师：负责把 Tag + 描述 转化为 高质量安全 Prompt
	const generateSafePromptByLLM = async (features, customText, style) => {
		const config = getCurrentLlmConfig();
		if (!config || !config.apiKey) throw new Error('请先在"我的"页面配置 LLM 聊天模型');

		// 准备素材
		const rawTags = JSON.stringify(features);
		const userDesc = customText || "无额外描述";

		// 给 LLM 的指令：融合、润色、清洗敏感词
		const systemInstruction = `
    [Role] You are an expert Anime Art Prompt Engineer for DALL-E 3.
    [Goal] Convert user inputs into a single, high-quality, descriptive English prompt.

    [Inputs]
    1. Character Tags (JSON): ${rawTags}
    2. Custom Description: "${userDesc}"
    3. Art Style: ${style || 'Anime'}

    [Rules]
    1. **Style**: Enforce "High-quality anime illustration, detailed masterpiece".
    2. **Composition**: "Solo, headshot portrait, looking at camera, simple background".
    3. **Fusion**: Combine the Tags and Custom Description naturally. If they conflict, prioritize Custom Description.
    4. **SAFETY FILTER (CRITICAL)**: 
       - The output MUST pass strict API safety filters.
       - **REWRITE** any NSFW/Sexual terms into safe, artistic, or suggestive descriptions:
         - "Milf" -> "Mature elegant lady"
         - "Nude/Naked/Exposed" -> "Wearing stylish cutout outfit" or "Alluring atmosphere"
         - "Huge breasts/Explosive breasts" -> "Voluptuous figure" or "Curvy body"
         - "T-back/Panty" -> "Denim shorts" or "Swimsuit bottom"
         - "Sex/Cum" -> REMOVE completely.
    
    [Output]
    Return ONLY the final English prompt string. No formatting, no markdown.
    `;

		console.log('🧠 正在请求 LLM 优化提示词...');

		const response = await LLM.chat({
			config,
			messages: [{
				role: 'user',
				content: systemInstruction
			}],
			temperature: 0.7,
			maxTokens: 400
		});

		// 清洗 LLM 可能返回的引号
		return response.replace(/^"|"$/g, '').trim();
	};

	// 2. 📡 OpenAI/豆包 生图请求函数
	const generateOpenAIImageInternal = async (baseUrl, apiKey, model, prompt) => {
		let targetUrl = baseUrl.trim();

		console.log(`🎨 [Create] 生图请求地址: ${targetUrl}`); // 建议加上日志方便调试

		const isSiliconFlow = targetUrl.includes('siliconflow') || targetUrl.includes('volces');


		const requestBody = {
			model: model || 'dall-e-3',
			prompt: prompt,
			n: 1,
			size: "1024x1024",
			response_format: "url"
		};
		// 硅基流动/豆包可能需要 image_size 参数
		if (isSiliconFlow) requestBody.image_size = "1024x1024";

		const res = await uni.request({
			url: targetUrl,
			method: 'POST',
			header: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			data: requestBody,
			timeout: 120000
		});

		if (res.statusCode === 200 && res.data?.data?.[0]?.url) {
			return res.data.data[0].url;
		} else {
			const errMsg = res.data?.error?.message || `Status ${res.statusCode}`;
			throw new Error(errMsg);
		}
	};

	// 3. 🚀 总入口函数
	const generateAvatar = async () => {
		// 基础校验
		if (!formData.value.appearance && !formData.value.charFeatures) {
			return uni.showToast({
				title: '请先填写外观描述或选择特征',
				icon: 'none'
			});
		}

		const imgConfig = uni.getStorageSync('app_image_config') || {};
		const provider = imgConfig.provider || 'comfyui';

		isGenerating.value = true;
		formData.value.avatar = '';

		try {
			// 🔥 分支 1：OpenAI (LLM 智能组装)
			if (provider === 'openai') {
				loadingText.value = 'AI正在构思...';
				console.log('🤖 启用 LLM 智能组装逻辑...');

				// A. 让 LLM 写 Prompt (保持不变)
				const aiOptimizedPrompt = await generateSafePromptByLLM(
					formData.value.charFeatures,
					formData.value.appearance,
					imgConfig.style
				);

				console.log('🧩 LLM 输出 Prompt:', aiOptimizedPrompt);

				// B. 生图 (保持不变)
				loadingText.value = '正在绘图...';
				const url = await generateOpenAIImageInternal(
					imgConfig.baseUrl,
					imgConfig.apiKey,
					imgConfig.model,
					aiOptimizedPrompt
				);

				// 🔥🔥🔥 [新增] 保存逻辑 🔥🔥🔥
				loadingText.value = '正在保存...';

				const savedPath = await saveToGallery(
					url,
					targetId.value || 'temp_create',
					formData.value.name || '未命名角色',
					aiOptimizedPrompt
				);

				formData.value.avatar = savedPath;
				console.log('✅ OpenAI 生成成功并保存:', savedPath);
			} else {
				loadingText.value = 'ComfyUI绘图中...';
				console.log('🎨 启用 ComfyUI 原版逻辑...');
				await generateAvatarComfy();
			}

		} catch (error) {
			console.error('生成失败:', error);
			uni.showToast({
				title: '生成失败: ' + (error.message || '请检查配置'),
				icon: 'none',
				duration: 4000
			});
		} finally {
			isGenerating.value = false;
			loadingText.value = '生成中...';
		}
	};

	const applyTemplate = (key) => {
		const t = PERSONALITY_TEMPLATES[key];
		if (!t) return;
		currentTemplateKey.value = key;

		const defaultDynamicBias = `STAGES:
- 陌生人: 先观望与试探，礼貌但有边界；对私密要求会转移话题或婉拒。
- 熟人: 放松一点但仍保留底线；会用小玩笑测试对方分寸与诚意。
- 朋友: 更愿意分享日常与情绪；遇到冒犯会直说不满或冷处理。
- 暧昧: 允许轻度撩拨与试探，但不轻易承诺；会观察对方行动是否一致。
- 恋人: 亲昵与占有欲更明显；愿意妥协但仍坚持核心原则与生活节奏。
- 冷战/不信任: 语气变冷、减少投入；需要明确道歉与补偿才能回暖。
- 敌对/仇视: 只做必要交流；优先自保与反击，拒绝亲密互动。

TRIGGERS:
- 关系升级触发: 真诚关心与持续行动、尊重边界、关键时刻的支持与可靠。
- 关系降级触发: 撒谎背叛、羞辱轻视、强迫越界、反复失信或控制欲过强。

BOUNDARY_HANDLING:
- 对方越界时: 先提醒与设限；再转移/拒绝；多次越界则冷处理或拉开距离（按关系阶段调整力度，但不违背核心）。
- 对方道歉或补偿时: 先看态度与行动是否一致；给台阶但保留观察期。`;

		formData.value.bio = t.bio;
		formData.value.speakingStyle = t.style;
		formData.value.likes = t.likes;
		formData.value.dislikes = t.dislikes;
		formData.value.personalityCore = t.logic;
		formData.value.personalityDynamic = defaultDynamicBias;
		formData.value.personalityNormal = t.logic;

		uni.showToast({
			title: `已应用: ${t.label}`,
			icon: 'none'
		});
	};

	onLoad(async (options) => {
		// 🔥 2. 在 onLoad 顶部加入这段：读取配置，更新按钮显示的文字
		const savedImgConfig = uni.getStorageSync('app_image_config');
		if (savedImgConfig && savedImgConfig.provider) {
			imgProvider.value = savedImgConfig.provider;
		}
		loadWorldTemplates();

		if (options.id) {
			isEditMode.value = true;
			targetId.value = options.id;
			await loadCharacterData(options.id);
			uni.setNavigationBarTitle({
				title: '角色设置'
			});
		} else {
			activeSections.value.basic = true;
		}
	});

	const handleWorldChange = async (e) => {
		worldIndex.value = Number(e.detail.value);
		if (selectedWorld.value) {
			await loadWorldResidents(selectedWorld.value.id);
			applyWorldDefaults(selectedWorld.value);
		} else {
			await loadWorldResidents('');
		}
	};
	const handleResidenceZoneChange = (e) => {
		const zone = selectedResidentialZones.value[Number(e.detail.value)];
		formData.value.residenceZoneId = zone?.id || '';
		formData.value.residenceUnitId = '';
		syncResidenceSelection();
	};
	const handleResidenceUnitChange = (e) => {
		const unit = availableResidenceUnits.value[Number(e.detail.value)];
		selectResidenceUnit(unit?.id || '');
	};
	const selectResidenceUnit = (unitId = '') => {
		formData.value.residenceUnitId = unitId;
		formData.value.location = buildResidenceLabel(selectedWorld.value || {}, {
			zoneId: formData.value.residenceZoneId,
			unitId: formData.value.residenceUnitId
		}) || '';
	};

	const handleUserWorldChange = (e) => {
		userWorldIndex.value = e.detail.value;
		if (selectedUserWorld.value) formData.value.userWorldId = selectedUserWorld.value.id;
	};

	// AiChat/pages/create/create.vue

	const loadCharacterData = async (id) => {
		await characterStore.initContacts();
		const target = await characterStore.loadCharacterById(id);
		if (target) {
			formData.value.name = target.name;
			formData.value.gender = (target.settings && target.settings.gender) || '女';
			formData.value.age = (target.settings && target.settings.age) || ''; // ✨ 新增
			formData.value.avatar = target.avatar;
			formData.value.worldId = target.worldId || '';
			formData.value.residenceZoneId = target.townProfile?.residence?.zoneId || '';
			formData.value.residenceUnitId = target.townProfile?.residence?.unitId || '';
			formData.value.location = target.location || '';
			formData.value.occupation = target.occupation || (target.settings && target.settings.occupation) || '';
			formData.value.behaviorMode = resolveResidentBehaviorMode(target);
			const relationshipDraft = createRelationshipFormDraft(target);

			if (target.settings) {

				formData.value.userRelation = relationshipDraft.userRelation;
				formData.value.affinity = relationshipDraft.affinity;
				formData.value.relationshipArchetype = relationshipDraft.relationshipArchetype;
				formData.value.homeRooms = target.settings.homeRooms || ['客厅', '卧室', '厨房', '卫生间'];
				formData.value.appearance = target.settings.appearance || '';
				formData.value.appearanceSafe = target.settings.appearanceSafe || '';
				formData.value.appearanceNsfw = target.settings.appearanceNsfw || '';
				formData.value.faceStyle = target.settings.faceStyle || 'cute';
				formData.value.bio = target.settings.bio || '';
				formData.value.personality = target.settings.personality || ''; // ✨ 新增
				formData.value.speakingStyle = target.settings.speakingStyle || '';
				formData.value.likes = target.settings.likes || '';
				formData.value.dislikes = target.settings.dislikes || '';
				formData.value.flaws = target.settings.flaws || '';
				formData.value.secret = target.settings.secret || '';
				formData.value.conflictMode = target.settings.conflictMode || '';
				formData.value.personalityCore = target.settings.personalityCore || target.settings
					.personalityNormal || '';
				formData.value.personalityDynamic = target.settings.personalityDynamic || '';
				formData.value.personalityNormal = target.settings.personalityNormal || '';
				formData.value.evolutionLevel = target.settings.evolutionLevel || 1; // ✨ 新增
				formData.value.worldLore = target.settings.worldLore || '';

				if (target.settings.charFeatures) formData.value.charFeatures = {
					...formData.value.charFeatures,
					...target.settings.charFeatures
				};
				if (target.settings.userFeatures) formData.value.userFeatures = {
					...formData.value.userFeatures,
					...target.settings.userFeatures
				};
			}

			if (formData.value.worldId) {
				const idx = worldList.value.findIndex(w => String(w.id) === String(formData.value.worldId));
				if (idx !== -1) worldIndex.value = idx;
			}
			if (formData.value.userWorldId) {
				const uIdx = worldList.value.findIndex(w => String(w.id) === String(formData.value.userWorldId));
				if (uIdx !== -1) userWorldIndex.value = uIdx;
			}

			if (worldIndex.value !== -1) {
				await loadWorldResidents(formData.value.worldId);
				applyWorldDefaults(worldList.value[worldIndex.value], true);
			}

			formData.value.maxReplies = target.maxReplies || 1;


			formData.value.allowProactive = target.allowProactive || false;
			formData.value.proactiveInterval = target.proactiveInterval || 4;
			formData.value.proactiveNotify = target.proactiveNotify || false;

			formData.value.historyLimit = target.historyLimit !== undefined ? target.historyLimit : 20;
			formData.value.enableSummary = target.enableSummary || false;
			formData.value.summaryFrequency = target.summaryFrequency || 20;
			formData.value.summary = target.summary || '';

			// 🌟 核心修改：从 SQLite 数据库加载日记列表，显示在设置页下方
			try {
				const dbLogs = await DB.select(
					`SELECT * FROM diaries WHERE roleId = ? ORDER BY id DESC`,
					[String(id)]
				);
				if (typeof diaryList !== 'undefined') {
					diaryList.value = dbLogs.map(l => ({
						...l,
						expanded: false
					}));
				}
			} catch (e) {
				console.error('加载数据库日记列表失败', e);
			}

			// 读取 AI 可见日记目录的天数限制
			formData.value.diaryHistoryLimit = target.diaryHistoryLimit !== undefined ? target.diaryHistoryLimit :
				30;
			formData.value.activeMemoryDays = target.activeMemoryDays !== undefined ? target.activeMemoryDays : 3;

			// 加载经济系统数据（包含旧版钱包向后兼容）
			if (target.economy) {
				formData.value.economy = {
					isSharedWallet: target.economy.isSharedWallet || false,
					// 如果没有 userWallet，说明是旧存档，读取原来的 wallet，否则默认 1000
					userWallet: target.economy.userWallet !== undefined ? target.economy.userWallet : (target
						.economy.wallet || 1000),
					charWallet: target.economy.charWallet !== undefined ? target.economy.charWallet : 1000,
					dailyIncome: target.economy.dailyIncome !== undefined ? target.economy.dailyIncome : 100
				};
			}
		}
	};

	const getInitialGameTime = () => {
		const now = new Date();
		now.setHours(8, 0, 0, 0);
		return now.getTime();
	};


	const saveCharacter = async () => {
		if (!formData.value.name.trim()) return uni.showToast({
			title: '名字不能为空',
			icon: 'none'
		});

		const currentRole = isEditMode.value && targetId.value
			? await characterStore.loadCharacterById(targetId.value)
			: null;
		const relationshipPayload = buildRelationshipFieldsFromForm(formData.value, currentRole);

		let clothingStr = '便服';
		if (formData.value.charFeatures.topStyle || formData.value.charFeatures.bottomStyle) {
			clothingStr =
				`${formData.value.charFeatures.topStyle || ''} + ${formData.value.charFeatures.bottomStyle || ''}`;
		}

		// 提取旧的经济数据（为了保留包裹、容器里的物品不丢失）
		let existingEconomy = {
			courierBox: [],
			containers: {
				'厨房': {
					'冰箱': [],
					'橱柜': []
				},
				'卫生间': {
					'浴室柜': []
				},
				'卧室': {
					'床头柜': []
				}
			}
		};
		if (currentRole?.economy) {
			existingEconomy = currentRole.economy;
		}

		// 组装新的经济数据
		const finalEconomy = {
			...existingEconomy,
			isSharedWallet: formData.value.economy.isSharedWallet,
			userWallet: Number(formData.value.economy.userWallet) || 0,
			charWallet: Number(formData.value.economy.charWallet) || 0,
			dailyIncome: Number(formData.value.economy.dailyIncome) || 0,
			wallet: Number(formData.value.economy.userWallet) || 0 // 兼容旧代码，防止部分没改到的地方报错
		};
		const selectedResidence = {
			zoneId: String(formData.value.residenceZoneId || '').trim(),
			unitId: String(formData.value.residenceUnitId || '').trim()
		};
		const residenceLocationId = buildResidenceLocationId(selectedResidence.zoneId, selectedResidence.unitId);
		if (selectedWorld.value && selectedResidentialZones.value.length > 0 && !residenceLocationId) {
			return uni.showToast({
				title: '请选择住宅区和门牌号',
				icon: 'none'
			});
		}

		const residenceLabel = residenceLocationId ? buildResidenceLabel(selectedWorld.value || {}, selectedResidence) : '';
		const finalLocationLabel = residenceLabel || formData.value.location;
		const matchedProfession = (selectedWorld.value?.professions || []).find((item) => item.id === formData.value
			.occupation || item.name === formData.value.occupation);
		const previousHomeLocationId = currentRole?.townProfile?.homeLocationId || '';
		const previousCurrentLocationId = currentRole?.townRuntime?.currentLocationId || '';
		const shouldResetCurrentToHome = !currentRole || !previousCurrentLocationId || previousCurrentLocationId ===
			previousHomeLocationId;
		const nextCurrentLocationId = shouldResetCurrentToHome ? (residenceLocationId || previousCurrentLocationId || '') :
			(previousCurrentLocationId || residenceLocationId || '');
		const nextCurrentLocationName = shouldResetCurrentToHome ?
			(finalLocationLabel || currentRole?.townRuntime?.currentLocationName || currentRole?.currentLocation || '角色家') :
			(currentRole?.townRuntime?.currentLocationName || currentRole?.currentLocation || finalLocationLabel ||
				'角色家');
		const nextCurrentAction = currentRole?.townRuntime?.currentAction || currentRole?.currentAction || currentRole
			?.lastActivity || '待在原地';

		const charData = {
			name: formData.value.name,
			avatar: formData.value.avatar || '/static/ai-avatar.png',
			maxReplies: formData.value.maxReplies,
			allowProactive: formData.value.allowProactive,
			economy: finalEconomy,
			proactiveInterval: formData.value.proactiveInterval,
			proactiveNotify: formData.value.proactiveNotify,
			historyLimit: formData.value.historyLimit,
			diaryHistoryLimit: formData.value.diaryHistoryLimit,
			activeMemoryDays: formData.value.activeMemoryDays,
			enableSummary: formData.value.enableSummary,
			summaryFrequency: formData.value.summaryFrequency,
			summary: formData.value.summary,
			location: finalLocationLabel,
			currentLocation: nextCurrentLocationName,
			currentAction: nextCurrentAction,
			clothing: clothingStr,
			worldId: formData.value.worldId,
			occupation: formData.value.occupation,
			relation: relationshipPayload.relation,
			playerRelationship: relationshipPayload.playerRelationship,
			townProfile: {
				...(currentRole?.townProfile || {}),
				role: currentRole?.townProfile?.role || 'background',
				behaviorMode: formData.value.behaviorMode,
				residence: residenceLocationId ? selectedResidence : (currentRole?.townProfile?.residence || {
					zoneId: '',
					unitId: ''
				}),
				homeLocationId: residenceLocationId || currentRole?.townProfile?.homeLocationId || '',
				professionId: matchedProfession?.id || currentRole?.townProfile?.professionId || ''
			},
			townRuntime: {
				...(currentRole?.townRuntime || {}),
				currentLocationId: nextCurrentLocationId,
				currentLocationName: nextCurrentLocationName,
				currentAction: nextCurrentAction,
				availability: currentRole?.townRuntime?.availability || 'normal',
				autonomy: createResidentAutonomyRuntime(currentRole?.townRuntime?.autonomy),
				lastSimulatedSlice: currentRole?.townRuntime?.lastSimulatedSlice || 0
			},
			settings: {
				flaws: formData.value.flaws,
				secret: formData.value.secret,
				conflictMode: formData.value.conflictMode,
				gender: formData.value.gender,
				age: formData.value.age, // ✨ 新增
				appearance: formData.value.appearance,
				appearanceSafe: formData.value.appearanceSafe,
				appearanceNsfw: formData.value.appearanceNsfw,
				faceStyle: formData.value.faceStyle,
				charFeatures: formData.value.charFeatures,
				userNameOverride: formData.value.userNameOverride,
				...relationshipPayload.settingsPatch,
				homeRooms: formData.value.homeRooms,
				bio: formData.value.bio,
				personality: formData.value.personality, // ✨ 新增
				speakingStyle: formData.value.speakingStyle,
				likes: formData.value.likes,
				dislikes: formData.value.dislikes,
				occupation: formData.value.occupation,
				worldLore: formData.value.worldLore,
				personalityCore: formData.value.personalityCore || formData.value.personalityNormal,
				personalityDynamic: formData.value.personalityDynamic || '',
				personalityNormal: formData.value.personalityCore || formData.value.personalityNormal,
				evolutionLevel: formData.value.evolutionLevel, // ✨ 新增
			},
			lastMsg: isEditMode.value ? undefined : '新角色已创建',
			lastTime: isEditMode.value ? undefined : '刚刚',
			unread: isEditMode.value ? undefined : 0
		};

		if (isEditMode.value) {
			if (currentRole) {
				const updatedRole = {
					...currentRole,
					...charData
				};
				characterStore.upsertCharacter(updatedRole);
				await characterService.saveCharacter(updatedRole);
				uni.showToast({
					title: '修改已保存',
					icon: 'success'
				});
			} else {
				return uni.showToast({
					title: '未找到角色数据',
					icon: 'none'
				});
			}
		} else {
			const newChar = {
				id: Date.now(),
				...charData,
				lastTimeTimestamp: getInitialGameTime(),
				unread: 0,
			};
			await characterStore.addNewCharacter(newChar);
			uni.showToast({
				title: '创建成功',
				icon: 'success'
			});
		}

		setTimeout(() => {
			uni.navigateBack();
		}, 800);
	};

	const clearHistoryAndReset = () => {
		uni.showModal({
			title: '彻底重置',
			content: `将从数据库永久抹除聊天记录与日记，重置好感度、位置、状态，并让角色回归初始状态。确定吗？`,
			confirmColor: '#ff4757',
			success: async (res) => { // 🌟 变成 async 函数
				if (res.confirm && targetId.value) {
					const cid = String(targetId.value);

					// --- 🛠️ 新增：物理清理 SQLite 数据库 ----------------------
					try {
						// 1. 删除消息记录
						await DB.execute(`DELETE FROM messages WHERE chatId = ?`, [cid]);
						// 2. 删除往事日记
						await DB.execute(`DELETE FROM diaries WHERE roleId = ?`, [cid]);
						console.log('✅ SQLite 数据库相关记录已清空');
					} catch (dbErr) {
						console.error('❌ 数据库清理失败:', dbErr);
					}
					// --------------------------------------------------------

					// 3. 原有的 Storage 清理逻辑
					uni.removeStorageSync(`chat_history_${targetId.value}`);
					uni.removeStorageSync(`last_real_active_time_${targetId.value}`);
					uni.removeStorageSync(`last_proactive_lock_${targetId.value}`);
					// 如果你之前还存了日记缓存，也顺便清了
					uni.removeStorageSync(`diary_logs_${targetId.value}`);

					await characterStore.initContacts();
					const currentRole = await characterStore.loadCharacterById(cid);

					if (currentRole) {
						const preservedTime = currentRole.lastTimeTimestamp || getInitialGameTime();

						let clothingStr = '便服';
						if (formData.value.charFeatures.topStyle || formData.value.charFeatures
							.bottomStyle) {
							clothingStr =
								`${formData.value.charFeatures.topStyle || ''} + ${formData.value.charFeatures.bottomStyle || ''}`;
						}
						const resetRelationshipPayload = buildRelationshipFieldsFromForm(formData.value, currentRole);

						const resetData = {
							lastMsg: '（记忆已清空）',
							lastTime: '刚刚',
							lastTimeTimestamp: preservedTime,
							unread: 0,
							summary: '',
							currentLocation: formData.value.location || '角色家',

							// 👇👇👇 【新增】必须重置动作，否则会残留之前的动作状态 👇👇👇
							currentAction: '站立/闲逛',

							interactionMode: 'phone',
							clothing: clothingStr,
							lastActivity: '自由活动',
							relation: resetRelationshipPayload.relation,
							playerRelationship: resetRelationshipPayload.playerRelationship,
						};

						const resetRole = {
							...currentRole,
							...resetData,
							settings: {
								...(currentRole.settings || {}),
								...resetRelationshipPayload.settingsPatch
							}
						};
						characterStore.upsertCharacter(resetRole);
						await characterService.saveCharacter(resetRole);

						// ✨ 清空当前页面的日记列表显示
						if (typeof diaryList !== 'undefined') diaryList.value = [];

						uni.showToast({
							title: '重置成功',
							icon: 'success'
						});
						setTimeout(() => {
							uni.navigateBack();
						}, 800);
					} else {
						uni.showToast({
							title: '未找到角色数据',
							icon: 'none'
						});
					}
				}
			}
		});
	};
</script>

<style lang="scss">
	/* ==========================================================================
   1. 基础容器与全局背景
   ========================================================================== */
	.create-container {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: var(--bg-color);
		/* 适配全局背景 */
		overflow: hidden;
		transition: background-color 0.3s;
	}

	/* Scroll View 必须指定 flex-grow 和 height: 0 */
	.form-scroll {
		flex: 1;
		height: 0;
		width: 100%;
	}

	/* ==========================================================================
   2. 表单区块 (Section)
   ========================================================================== */
	.form-section {
		background-color: var(--card-bg);
		/* 适配卡片背景 */
		margin-top: 24rpx;
		overflow: hidden;
	}

	.section-header {
		padding: 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border-color);
		/* 适配边框 */
		transition: background-color 0.2s;
	}

	.section-header:active {
		background-color: var(--tool-bg);
		/* 点击态 */
	}

	.section-title-wrapper {
		display: flex;
		flex-direction: column;
	}

	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: var(--text-color);
		/* 适配文字 */
		border-left: 8rpx solid #007aff;
		padding-left: 20rpx;
	}

	.section-subtitle {
		font-size: 22rpx;
		color: var(--text-sub);
		/* 适配副标题 */
		margin-left: 28rpx;
		margin-top: 8rpx;
	}

	.arrow-icon {
		color: var(--text-sub);
		font-size: 24rpx;
		opacity: 0.5;
	}

	.section-content {
		padding: 30rpx;
		animation: slideDown 0.2s ease-out;
		/* 修复内容区背景色继承 */
		background-color: var(--card-bg);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10rpx);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ==========================================================================
   3. 子板块与分组 (Sub Group)
   ========================================================================== */
	.sub-group {
		border: 2rpx dashed var(--border-color);
		/* 虚线适配 */
		border-radius: 12rpx;
		margin-bottom: 24rpx;
		background-color: var(--tool-bg);
		/* 子板块底色略深 */
		overflow: hidden;
	}

	.sub-header {
		padding: 20rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: var(--pill-bg);
		/* 标题栏背景 */
		border-bottom: 1px solid var(--border-color);
	}

	.sub-title {
		font-size: 26rpx;
		font-weight: bold;
		color: var(--text-color);
		/* 适配 */
	}

	.sub-arrow {
		font-size: 22rpx;
		color: var(--text-sub);
	}

	.sub-content {
		padding: 20rpx;
	}

	/* 分类块 */
	.category-block {
		margin-bottom: 30rpx;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 20rpx;
	}

	.category-block:last-child {
		border-bottom: none;
	}

	.block-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		/* 保持深色，因为背景是黄色的 */
		margin-bottom: 20rpx;
		display: block;
		border-left: 6rpx solid #ffd700;
		padding-left: 12rpx;
		background-color: #fff9e6;
		/* 黄色高亮保持不变，或者夜间调暗 */
		padding-top: 4rpx;
		padding-bottom: 4rpx;
		border-radius: 4rpx;
	}

	/* ==========================================================================
   4. 特征标签 (Chips)
   ========================================================================== */
	.feature-row {
		margin-bottom: 20rpx;
		display: flex;
		flex-direction: column;
	}

	.feat-label {
		font-size: 24rpx;
		color: var(--text-sub);
		margin-bottom: 10rpx;
	}

	.chips-scroll {
		white-space: nowrap;
		width: 100%;
	}

	.chips-flex {
		display: flex;
		gap: 12rpx;
		padding-bottom: 4rpx;
		align-items: center;
	}

	.chip {
		display: inline-block;
		padding: 10rpx 24rpx;
		background-color: var(--card-bg);
		/* 适配 */
		border: 1px solid var(--border-color);
		border-radius: 8rpx;
		font-size: 24rpx;
		color: var(--text-color);
		transition: all 0.2s;
		box-shadow: var(--shadow);
	}

	.chip.active {
		background-color: rgba(0, 122, 255, 0.1);
		/* 适配激活态 */
		color: #007aff;
		border-color: #007aff;
		font-weight: bold;
		box-shadow: 0 2rpx 6rpx rgba(0, 122, 255, 0.2);
	}

	.chip-warn.active {
		background-color: rgba(211, 47, 47, 0.1);
		color: #d32f2f;
		border-color: #d32f2f;
	}

	.style-chip {
		padding: 12rpx 20rpx;
	}

	.separator {
		color: var(--border-color);
		font-size: 20rpx;
		margin: 0 4rpx;
	}

	/* ==========================================================================
   5. 输入框与控件
   ========================================================================== */
	.input-item,
	.textarea-item {
		margin-bottom: 30rpx;
	}

	.label {
		display: block;
		font-size: 28rpx;
		color: var(--text-sub);
		margin-bottom: 16rpx;
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16rpx;
	}

	.gen-btn {
		background-color: #007aff;
		color: #fff;
		font-size: 24rpx;
		padding: 6rpx 20rpx;
		border-radius: 30rpx;
		transition: all 0.3s;
	}

	.gen-btn.disabled {
		opacity: 0.6;
		background-color: #999;
		pointer-events: none;
		cursor: not-allowed;
	}

	.mini-btn-gen {
		background-color: var(--text-color);
		color: var(--card-bg);
		font-size: 24rpx;
		margin-top: 20rpx;
		border-radius: 40rpx;
	}

	.input {
		background-color: var(--input-bg);
		/* 适配输入框背景 */
		height: 80rpx;
		padding: 0 20rpx;
		border-radius: 10rpx;
		font-size: 30rpx;
		color: var(--text-color);
		border: 1px solid var(--border-color);
	}

	.picker-box {
		background-color: var(--input-bg);
		height: 80rpx;
		padding: 0 20rpx;
		border-radius: 10rpx;
		font-size: 30rpx;
		line-height: 80rpx;
		color: var(--text-color);
		border: 1px solid var(--border-color);
	}

	.textarea {
		background-color: var(--input-bg);
		width: 100%;
		padding: 20rpx;
		border-radius: 10rpx;
		font-size: 30rpx;
		color: var(--text-color);
		height: 160rpx;
		box-sizing: border-box;
		border: 1px solid var(--border-color);
	}

	.textarea.large {
		height: 240rpx;
	}

	.memory-box {
		border: 2rpx dashed #9b59b6;
		background-color: rgba(155, 89, 182, 0.05);
		/* 适配 */
		color: var(--text-sub);
		line-height: 1.6;
	}

	.tip {
		font-size: 24rpx;
		color: var(--text-sub);
		margin-top: 10rpx;
		display: block;
		line-height: 1.5;
	}

	.setting-tip {
		font-size: 24rpx;
		margin-bottom: 20rpx;
		padding: 10rpx;
		border-radius: 8rpx;
		background: rgba(46, 204, 113, 0.1);
		color: #2ecc71;
		/* 绿色提示保持醒目 */
	}

	/* 头像预览 */
	.avatar-preview-box {
		margin-top: 20rpx;
		display: flex;
		justify-content: center;
	}

	.avatar-preview {
		width: 160rpx;
		height: 160rpx;
		border-radius: 20rpx;
		border: 2px solid var(--border-color);
		background: var(--card-bg);
	}

	.avatar-placeholder {
		width: 160rpx;
		height: 160rpx;
		border-radius: 20rpx;
		background: var(--input-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px dashed var(--text-sub);
	}

	.avatar-emoji {
		font-size: 60rpx;
	}

	/* 快速标签 */
	.quick-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-top: 12rpx;
	}

	.tag {
		background-color: rgba(0, 122, 255, 0.1);
		color: #007aff;
		padding: 8rpx 20rpx;
		border-radius: 30rpx;
		font-size: 24rpx;
		border: 1px solid transparent;
	}

	.job-tag {
		background-color: rgba(156, 39, 176, 0.1);
		color: #9c27b0;
	}

	/* ==========================================================================
   6. 底部操作区
   ========================================================================== */
	.bottom-area {
		padding: 20rpx 30rpx;
		background-color: var(--card-bg);
		/* 适配 */
		border-top: 1px solid var(--border-color);
		padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	}

	.save-btn {
		background-color: #007aff;
		color: #fff;
		border-radius: 40rpx;
		font-size: 32rpx;
	}

	.clear-btn {
		background-color: rgba(255, 71, 87, 0.1);
		color: #ff4757;
		font-size: 30rpx;
		border: 1px solid #ff4757;
		width: 100%;
	}

	.slider-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.help-text {
		font-size: 22rpx;
		color: var(--text-sub);
		margin-bottom: 12rpx;
	}

	/* ==========================================================================
   7. 特定组件：风格卡片 & 时间选择器
   ========================================================================== */
	/* 迷你风格卡片 */
	.style-mini-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12rpx;
		margin-bottom: 20rpx;
	}

	.style-mini-card {
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 8rpx;
		padding: 12rpx 0;
		text-align: center;
		font-size: 22rpx;
		color: var(--text-sub);
	}

	.style-mini-card.active {
		border-color: #e67e22;
		background-color: rgba(255, 243, 224, 0.1);
		/* 适配 */
		color: #d35400;
		font-weight: bold;
	}

	/* 时间范围输入框 */
	.time-range-box {
		display: flex;
		align-items: center;
		gap: 20rpx;
	}

	.time-input-wrapper {
		display: flex;
		align-items: center;
		background: var(--input-bg);
		padding: 12rpx 24rpx;
		border-radius: 12rpx;
		border: 1px solid var(--border-color);
	}

	.mini-input {
		width: 60rpx;
		text-align: center;
		font-weight: bold;
		font-size: 30rpx;
		color: var(--text-color);
	}

	.suffix {
		color: var(--text-sub);
		font-size: 24rpx;
		margin-left: 4rpx;
	}

	/* 星期选择器 */
	.weekday-selector {
		display: flex;
		gap: 16rpx;
		flex-wrap: wrap;
		margin-top: 10rpx;
	}

	.day-chip {
		width: 72rpx;
		height: 72rpx;
		border-radius: 50%;
		background: var(--tool-bg);
		color: var(--text-sub);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24rpx;
		transition: all 0.2s;
		border: 2px solid transparent;
	}

	.day-chip.active {
		background: rgba(0, 122, 255, 0.1);
		color: #007aff;
		border-color: #007aff;
		font-weight: bold;
		box-shadow: 0 2rpx 6rpx rgba(0, 122, 255, 0.2);
	}

	.tip-text {
		font-size: 22rpx;
		color: var(--text-sub);
		margin-top: 12rpx;
		display: block;
	}

	/* 自定义输入框 */
	.input-row {
		margin-bottom: 12rpx;
	}

	.mini-input-text {
		width: 100%;
		height: 60rpx;
		background: var(--input-bg);
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 26rpx;
		color: var(--text-color);
		border: 1px solid var(--border-color);
		box-sizing: border-box;
	}

	.mini-input-text:focus {
		background: var(--card-bg);
		border-color: #007aff;
	}
</style>
