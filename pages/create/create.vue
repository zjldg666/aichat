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

          <view class="sub-group">
             <view class="sub-header" @click="toggleSubSection('charWork')">
                 <text class="sub-title">🏢 工作与作息</text>
                 <text class="sub-arrow">{{ subSections.charWork ? '▼' : '▶' }}</text>
             </view>
             
             <view v-show="subSections.charWork" class="sub-content">
                 <view class="setting-tip">设定后，工作时间去她家可能会扑空，去单位能偶遇。</view>
                 
                 <view class="input-item">
                     <text class="label">工作场所</text>
                     <input class="input" 
                            v-model="formData.workplace" 
                            placeholder="例：公司 / 学校 / 医院 (留空则默认为'公司')" />
                 </view>
          
                 <view class="input-item">
                     <text class="label">工作时间 (24小时制)</text>
                     <view class="time-range-box">
                         <view class="time-input-wrapper">
                             <input class="mini-input" type="number" v-model.number="formData.workStartHour" />
                             <text class="suffix">:00</text>
                         </view>
                         <text class="separator">至</text>
                         <view class="time-input-wrapper">
                             <input class="mini-input" type="number" v-model.number="formData.workEndHour" />
                             <text class="suffix">:00</text>
                         </view>
                     </view>
                 </view>
          
                 <view class="input-item" style="margin-bottom: 0;">
                     <text class="label">每周上班日</text>
                     <view class="weekday-selector">
                         <view 
                             class="day-chip" 
                             v-for="day in weekDayOptions" 
                             :key="day.value"
                             :class="{ 'active': formData.workDays.includes(day.value) }"
                             @click="toggleWorkDay(day.value)"
                         >
                             周{{ day.label }}
                         </view>
                     </view>
                     <text class="tip-text" v-if="formData.workDays.length === 0">
                         (未选中任何日期，视为全职在家/自由职业)
                     </text>
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
                     <picker mode="selector" :range="worldList" range-key="name" :value="worldIndex" @change="handleWorldChange">
                         <view class="picker-box">
                             {{ selectedWorld ? selectedWorld.name : '🌐 默认/未选择 (点击选择)' }}
                         </view>
                     </picker>
                  </view>
                  <view class="textarea-item">
                      <text class="label">🌍 世界观法则 (Lore)</text>
                      <view class="tips-text" style="font-size:22rpx; color:#999; margin-bottom:10rpx;">
                          定义这个世界的物理规则、魔法体系、社会常识。
                      </view>
                      <textarea 
                          class="textarea" 
                          style="height: 180rpx;" 
                          v-model="formData.worldLore" 
                          placeholder="例：这是一个赛博朋克世界，财阀统治一切..." 
                          maxlength="-1" 
                      />
                  </view>
                  <template v-if="selectedWorld">
                      <view class="input-item">
                        <text class="label">居住地址</text>
                        <input class="input" v-model="formData.location" placeholder="输入地址" />
                        <view class="quick-tags" v-if="selectedWorld.locations">
                            <view v-for="(loc, idx) in selectedWorld.locations" :key="idx" class="tag" @click="formData.location = loc">{{ loc }}</view>
                        </view>
                      </view>
                      <view class="input-item">
                        <text class="label">职业身份</text>
                        <input class="input" v-model="formData.occupation" placeholder="输入职业" />
                        <view class="quick-tags" v-if="selectedWorld.occupations">
                            <view v-for="(job, idx) in selectedWorld.occupations" :key="idx" class="tag job-tag" @click="formData.occupation = job">{{ job }}</view>
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
                              <input class="mini-input-text" 
                                     v-model="formData.faceStyle" 
                                     placeholder="例: sharp eyes, smug smile (自信吊眼)" />
                          </view>
                          
                          <view class="tip" style="margin-bottom: 12rpx; font-size: 22rpx; color: #666; line-height: 1.5; background: #f9f9f9; padding: 12rpx; border-radius: 8rpx;">
                              <view class="tip" style="margin-bottom: 12rpx; font-size: 22rpx; color: #666; line-height: 1.5; background: #f9f9f9; padding: 12rpx; border-radius: 8rpx;">
                                                            <text style="font-weight: bold; color: #333;">💡 自定义指南 (英文词汇)：</text><br/>
                                                            👀 <text style="color:#007aff;">眼型：</text> tsurime (吊眼), tareme (下垂眼), sanpaku (三白眼), slit pupils (竖瞳)<br/>
                                                            ✨ <text style="color:#007aff;">气质：</text> shy (害羞), gloomy (阴郁/黑眼圈), arrogant (傲慢), gentle (温柔), expressionless (无表情)
                                                        </view>
                          </view>

                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="(tags, key) in FACE_STYLES_MAP" :key="key" 
                                        class="chip style-chip" 
                                        :class="{active: formData.faceStyle === key}" 
                                        @click="formData.faceStyle = key">
                                      {{ getStyleLabel(key) }}
                                  </view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">发色</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.hairColor" placeholder="输入发色 (如: 渐变粉色)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.hairColor" :key="item" class="chip" :class="{active: formData.charFeatures.hairColor === item}" @click="setFeature('char', 'hairColor', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">发型</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.hairStyle" placeholder="输入发型 (如: 侧马尾)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.hairStyle" :key="item" class="chip" :class="{active: formData.charFeatures.hairStyle === item}" @click="setFeature('char', 'hairStyle', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">瞳色/眼型</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.eyeColor" placeholder="输入眼瞳 (如: 星星眼)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.eyeColor" :key="item" class="chip" :class="{active: formData.charFeatures.eyeColor === item}" @click="setFeature('char', 'eyeColor', item)">{{item}}</view>
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
                                                        <view v-for="item in OPTIONS.wearStatus" :key="item" 
                                                              class="chip" 
                                                              :class="{
                                                                  'active': formData.charFeatures.wearStatus === item,
                                                                  'chip-warn': item === '暴露/H' 
                                                              }" 
                                                              @click="setFeature('char', 'wearStatus', item)">
                                                            {{item}}
                                                        </view>
                                                    </view>
                                                </scroll-view>
                                            </view>
                      <view class="feature-row">
                          <text class="feat-label">上衣颜色</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.topColor" placeholder="自定义颜色" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.clothingColor" :key="item" class="chip" :class="{active: formData.charFeatures.topColor === item}" @click="setFeature('char', 'topColor', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">上衣款式</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.topStyle" placeholder="输入款式 (如: 露脐T恤)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.topStyle" :key="item" class="chip" :class="{active: formData.charFeatures.topStyle === item}" @click="setFeature('char', 'topStyle', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">皮肤状态</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.skinGloss" placeholder="输入状态 (如: 晒痕)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.skinGloss" :key="item" class="chip" :class="{active: formData.charFeatures.skinGloss === item}" @click="setFeature('char', 'skinGloss', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">胸围</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.chestSize" placeholder="输入尺寸" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.chestSize" :key="item" class="chip" :class="{active: formData.charFeatures.chestSize === item}" @click="setFeature('char', 'chestSize', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                  </view>

                  <view class="category-block">
                      <text class="block-title">C. 下身穿搭 (Bottom)</text>
                      
                      <view class="feature-row">
                          <text class="feat-label">下装颜色</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.bottomColor" placeholder="自定义颜色" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.clothingColor" :key="item" class="chip" :class="{active: formData.charFeatures.bottomColor === item}" @click="setFeature('char', 'bottomColor', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">下装款式</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.bottomStyle" placeholder="输入款式 (如: 瑜伽裤)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.bottomStyle" :key="item" class="chip" :class="{active: formData.charFeatures.bottomStyle === item}" @click="setFeature('char', 'bottomStyle', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">腿部/袜子</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.legWear" placeholder="输入款式 (如: 腿环)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.legWear" :key="item" class="chip" :class="{active: formData.charFeatures.legWear === item}" @click="setFeature('char', 'legWear', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                  </view>

                  <view class="category-block">
                      <text class="block-title">D. 身体线条</text>
                      
                      <view class="feature-row">
                          <text class="feat-label">腰部</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.waist" placeholder="输入描述 (如: 人鱼线)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.waist" :key="item" class="chip" :class="{active: formData.charFeatures.waist === item}" @click="setFeature('char', 'waist', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">臀部</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.hips" placeholder="输入描述 (如: 蜜桃臀)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.hips" :key="item" class="chip" :class="{active: formData.charFeatures.hips === item}" @click="setFeature('char', 'hips', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">腿型</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.legs" placeholder="输入描述 (如: 丰满大腿)" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.legs" :key="item" class="chip" :class="{active: formData.charFeatures.legs === item}" @click="setFeature('char', 'legs', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                  </view>

                  <view class="category-block">
                      <text class="block-title" style="color: #ff6b81;">E. dddd</text>
                      
                      <view class="feature-row">
                          <text class="feat-label">蓓蕾颜色</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.nippleColor" placeholder="自定义" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.nippleColor" :key="item" class="chip" :class="{active: formData.charFeatures.nippleColor === item}" @click="setFeature('char', 'nippleColor', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">丛林状态</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.pubicHair" placeholder="自定义" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.pubicHair" :key="item" class="chip" :class="{active: formData.charFeatures.pubicHair === item}" @click="setFeature('char', 'pubicHair', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>

                      <view class="feature-row">
                          <text class="feat-label">花朵形态</text>
                          <input class="mini-input-text" v-model="formData.charFeatures.vulvaType" placeholder="自定义" />
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.vulvaType" :key="item" class="chip" :class="{active: formData.charFeatures.vulvaType === item}" @click="setFeature('char', 'vulvaType', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                  </view>
                  
                  <button class="mini-btn-gen" @click="generateEnglishPrompt">⬇️ 组装并翻译 Prompt</button>
              </view>
          </view>

          <view class="textarea-item">
            <text class="label">固定外貌 Prompt (英文 - 将直接用于生图)</text>
            <textarea class="textarea large" v-model="formData.appearance" placeholder="1girl, cute face..." maxlength="-1" />
            <view class="tip">Chat页面将直接使用此段 Prompt。</view>
          </view>

          <view class="input-item">
            <view class="label-row">
                <text class="label" style="margin-bottom:0;">头像链接</text>
                
                <view 
                  class="gen-btn" 
                  :class="{ 'disabled': isGenerating }" 
                  @click="generateAvatar" 
                  hover-class="gen-btn-hover"
                >
                  {{ isGenerating ? loadingText : (imgProvider === 'openai' ? '✨ OpenAI 生成' : '🎨 ComfyUI 生成') }}
                </view>
                </view>
            <input class="input" v-model="formData.avatar" placeholder="输入链接 或 点击上方生成" />
			<view class="avatar-preview-box">
			   <image v-if="formData.avatar && formData.avatar.length > 10" :src="formData.avatar" class="avatar-preview" mode="aspectFill"></image>
			   <view v-else class="avatar-placeholder"><text class="avatar-emoji">📷</text></view>
			</view>
            </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-header" @click="toggleSection('player')">
          <view class="section-title-wrapper">
            <view class="section-title" style="color: #2ecc71;">玩家设定 (你)</view>
            <text class="section-subtitle">你的身份、世界、外貌</text>
          </view>
          <text class="arrow-icon">{{ activeSections.player ? '▼' : '▶' }}</text>
        </view>
        
        <view v-show="activeSections.player" class="section-content">
           <view class="sub-group">
               <view class="sub-header" @click="toggleSubSection('userWorld')">
                   <text class="sub-title">🌍 你的世界</text>
                   <text class="sub-arrow">{{ subSections.userWorld ? '▼' : '▶' }}</text>
               </view>
               <view v-show="subSections.userWorld" class="sub-content">
                <view class="input-item">
                     <text class="label">你的昵称</text>
                     <input class="input" v-model="formData.userNameOverride" placeholder="例：阿林 (留空则使用APP全局昵称)" />
                 </view>
                 <view class="input-item">
                    <text class="label">你们的关系</text>
                    <input class="input" v-model="formData.userRelation" placeholder="例：青梅竹马 / 刚认识的邻居 / 你的债主" />
                 </view>
                 <view class="textarea-item">
                    <text class="label">你的性格/人设</text>
                    <textarea class="textarea" style="height: 120rpx;" v-model="formData.userPersona" placeholder="例：性格内向，容易害羞，不敢直视女生..." maxlength="-1" />
                 </view>
                   <view class="input-item">
                      <text class="label">所属世界</text>
                      <picker mode="selector" :range="worldList" range-key="name" :value="userWorldIndex" @change="handleUserWorldChange">
                          <view class="picker-box">{{ selectedUserWorld ? selectedUserWorld.name : '🌐 与角色保持一致 (或默认)' }}</view>
                      </picker>
                   </view>
                   <template v-if="selectedUserWorld">
                       <view class="input-item"><text class="label">你的住址</text><input class="input" v-model="formData.userLocation" /></view>
                       <view class="input-item"><text class="label">你的身份</text><input class="input" v-model="formData.userOccupation" /></view>
                   </template>
                   <template v-else>
                       <view class="input-item"><text class="label">你的住址</text><input class="input" v-model="formData.userLocation" /></view>
                       <view class="input-item"><text class="label">你的身份</text><input class="input" v-model="formData.userOccupation" /></view>
                   </template>
               </view>
           </view>

           <view class="sub-group">
               <view class="sub-header" @click="toggleSubSection('userLooks')">
                   <text class="sub-title">🧔‍♂️ 你的外貌 (男性特征)</text>
                   <text class="sub-arrow">{{ subSections.userLooks ? '▼' : '▶' }}</text>
               </view>
               <view v-show="subSections.userLooks" class="sub-content">
                   <view class="category-block">
                        <text class="block-title">基本特征</text>
                        <view class="feature-row">
                           <text class="feat-label">发型</text>
                           <scroll-view scroll-x class="chips-scroll">
                               <view class="chips-flex">
                                   <view v-for="item in OPTIONS.maleHair" :key="item" class="chip" :class="{active: formData.userFeatures.hair === item}" @click="setFeature('user', 'hair', item)">{{item}}</view>
                               </view>
                           </scroll-view>
                        </view>
                        <view class="feature-row">
                           <text class="feat-label">身材</text>
                           <scroll-view scroll-x class="chips-scroll">
                               <view class="chips-flex">
                                   <view v-for="item in OPTIONS.maleBody" :key="item" class="chip" :class="{active: formData.userFeatures.body === item}" @click="setFeature('user', 'body', item)">{{item}}</view>
                               </view>
                           </scroll-view>
                        </view>
                   </view>

                   <button class="mini-btn-gen" @click="generateUserDescription">⬇️ 生成玩家 Prompt (英文)</button>
               </view>
           </view>
           
           <view class="textarea-item">
             <text class="label">玩家外貌 Prompt (英文 - 用于双人生图)</text>
             <textarea class="textarea" v-model="formData.userAppearance" placeholder="1boy, short hair..." maxlength="-1" />
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
             <textarea class="textarea" v-model="formData.bio" placeholder="例：她是刚搬来的人妻邻居，丈夫常年出差。她性格..." maxlength="-1" />
           </view>

           <view class="textarea-item">
             <text class="label">🗣️ 说话风格 / 口癖</text>
             <textarea class="textarea" style="height:120rpx;" v-model="formData.speakingStyle" placeholder="例：语气慵懒，喜欢叫人“小弟弟”..." maxlength="-1" />
           </view>
           
           <view class="input-item">
               <text class="label">❤️ 喜好 (Likes)</text>
               <input class="input" v-model="formData.likes" placeholder="XP系统/喜欢的事物" />
           </view>
           <view class="input-item">
               <text class="label">⚡ 雷点 (Dislikes)</text>
               <input class="input" v-model="formData.dislikes" placeholder="厌恶的行为" />
           </view>

           <view class="input-item" style="margin-top: 30rpx; padding: 20rpx; background: #e3f2fd; border-radius: 16rpx; border: 1px dashed #2196f3;">
              <view style="text-align: center;">
                  <view style="font-size: 28rpx; font-weight: bold; color: #1976d2; margin-bottom: 10rpx;">✨ AI 行为逻辑生成</view>
                  <view style="font-size: 22rpx; color: #666; margin-bottom: 20rpx;">不再使用死板的好感度。让 AI 分析人设，生成她该如何对待你。</view>
                  <button @click="autoGenerateBehavior" style="background: #2196f3; color: white; font-size: 26rpx; border-radius: 40rpx; width: 80%;">🚀 生成行为逻辑</button>
              </view>
           </view>
			<view class="input-item" style="display: flex; justify-content: space-between; align-items: center; margin-top: 30rpx; padding-top: 20rpx; border-top: 1px dashed #eee;">
			<view>
				<text class="label" style="margin-bottom: 4rpx; display: block;">📸 允许角色主动发图 (消耗算力)</text>
				<text class="tip" style="font-size: 22rpx; color: #999;">开启后，她会在炫耀衣服或分享生活时主动发照片。<br>关闭后，只有你明确索取时才会发。</text>
			</view>
			<switch :checked="formData.allowSelfImage" @change="(e) => formData.allowSelfImage = e.detail.value" color="#ff9f43"/>
			</view>

           <view class="textarea-item" style="margin-top: 20rpx;">
             <text class="label">🧠 核心行为逻辑 (Behavior Logic)</text>
             <view class="help-text">这里决定了她是个什么样的人。是见面就白给，还是高冷到底。全靠这段描述。</view>
             <textarea class="textarea large" style="height: 300rpx;" v-model="formData.personalityNormal" placeholder="AI将严格遵循此逻辑行动..." maxlength="-1" />
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
	                        <text class="label" style="color:#007aff; font-weight:bold;">🧠 最近印象 (Active): {{ formData.activeMemoryDays }} 天</text>
	                    </view>
	                    <slider :value="formData.activeMemoryDays" min="0" max="7" step="1" show-value activeColor="#007aff" @change="(e) => formData.activeMemoryDays = e.detail.value" />
	                    <view class="tip" style="color:#666;">这几天的回忆大纲会<text style="font-weight:bold; color:#007aff">始终</text>包含在对话背景里，直接影响她的当下语气。</view>
	                </view>
	            
	                <view class="input-item" style="margin-top:20rpx; background:#f3e5f5; padding:15rpx; border-radius:12rpx;">
	                    <view class="slider-header">
	                        <text class="label" style="color:#9b59b6; font-weight:bold;">📚 往事检索范围 (Passive): {{ formData.diaryHistoryLimit }} 天</text>
	                    </view>
	                    <slider :value="formData.diaryHistoryLimit" min="7" max="60" step="1" show-value activeColor="#9b59b6" @change="(e) => formData.diaryHistoryLimit = e.detail.value" />
	                    <view class="tip" style="color:#666;">当你问起很久以前的事时，她会在这个范围内进行搜索和回忆。</view>
	                </view>
	            
	                <view class="diary-list" style="margin-top: 40rpx;">
	                    <text class="label" style="margin-bottom: 20rpx; display: block;">📖 往事日记本 ({{ diaryList.length }})</text>
	                    
	                    <view v-if="diaryList.length === 0" class="empty-tip" style="text-align:center; color:#999; padding:20rpx; font-size: 24rpx;">
	                        暂无日记，去和她多聊聊天吧~
	                    </view>
	  
						<view 
						v-for="(log, index) in diaryList" 
						:key="index" 
						class="diary-item" 
						style="background:#fff; padding:20rpx; margin-bottom:16rpx; border-radius:12rpx; border:1px solid #eee;"
						@click="log.expanded = !log.expanded"
						@longpress="handleDeleteDiary(log, index)" 
						>

	                      <view class="diary-header" style="display:flex; justify-content:space-between; align-items:center;">
	                        <text class="diary-date" style="font-size:24rpx; color:#999;">{{ log.dateStr }}</text>
	                        <text class="diary-mood" style="font-size:24rpx; background:#f0f0f0; padding:2rpx 10rpx; border-radius:8rpx;">{{ log.mood || '❤️' }}</text>
	                      </view>
	                      
	                      <view class="diary-brief" style="font-size:28rpx; font-weight:bold; margin:10rpx 0; color:#333;">
	                        {{ log.brief }}
	                      </view>
	                      
	                      <view v-if="log.expanded" class="diary-detail" style="margin-top:16rpx; padding-top:16rpx; border-top:1px dashed #eee; font-size:26rpx; color:#555; line-height:1.6;">
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
            <view class="section-title-wrapper"><view class="section-title" style="color: #9b59b6;">记忆增强</view></view>
            <text class="arrow-icon">{{ activeSections.memory ? '▼' : '▶' }}</text>
          </view>
          <view v-show="activeSections.memory" class="section-content">
              <view class="input-item">
                  <view class="slider-header"><text class="label">上下文深度 (History Limit): {{ formData.historyLimit }}</text></view>
                  <slider :value="formData.historyLimit" min="10" max="60" step="2" show-value activeColor="#9b59b6" @change="(e) => formData.historyLimit = e.detail.value" />
                  <view class="tip">控制AI能“看到”的最近聊天记录条数。</view>
              </view>
              
              <view class="input-item" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #eee; padding-top:20rpx; margin-top:20rpx;">
                <text class="label" style="margin-bottom:0;">开启长期记忆自动总结</text>
                <switch :checked="formData.enableSummary" @change="(e) => formData.enableSummary = e.detail.value" color="#9b59b6"/>
              </view>
              <template v-if="formData.enableSummary">
                  <view class="input-item">
                      <view class="slider-header"><text class="label">总结频率: {{ formData.summaryFrequency }}</text></view>
                      <slider :value="formData.summaryFrequency" min="10" max="50" step="5" show-value activeColor="#9b59b6" @change="(e) => formData.summaryFrequency = e.detail.value" />
                  </view>
                  <view class="textarea-item">
                    <view class="slider-header"><text class="label">当前长期记忆摘要</text><text class="tip" style="color:#9b59b6;" @click="formData.summary = ''">清空</text></view>
                    <textarea class="textarea large memory-box" v-model="formData.summary" maxlength="-1" />
                  </view>
              </template>
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
import { ref, computed } from 'vue';
import { onLoad ,onShow} from '@dcloudio/uni-app';

import { DB } from '@/utils/db.js';
// 引入常量
import { FACE_STYLES_MAP, FACE_LABELS } from '@/utils/constants.js';
// 引入逻辑 Hook
import { useCharacterCreate } from '@/composables/useCharacterCreate.js';
import { IMAGE_GENERATOR_OPENAI_PROMPT } from '@/utils/prompts.js';
import { LLM, getCurrentLlmConfig } from '@/services/llm.js';
import { saveToGallery } from '@/utils/gallery-save.js';
const imgProvider = ref('comfyui');
import { useTheme } from '@/composables/useTheme.js';
const { isDarkMode, applyNativeTheme } = useTheme();
// =========================================================================
// 1. 常量定义 (UI 选项保留在页面内是没问题的)
// =========================================================================
const OPTIONS = {
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
   
};



// =========================================================================
// 2. 状态管理 (必须先定义这些，才能传给 useCharacterCreate)
// =========================================================================

const isEditMode = ref(false);
const targetId = ref(null);
const currentTemplateKey = ref('');

// 界面折叠状态
const activeSections = ref({ basic: false, player: false, core: false, init: false, memory: false, danger: false });
const toggleSection = (key) => { activeSections.value[key] = !activeSections.value[key]; };

const subSections = ref({ charWorld: false, charWork: false, charLooks: false, userWorld: false, userLooks: false });
const toggleSubSection = (key) => { subSections.value[key] = !subSections.value[key]; };

const worldList = ref([]);
const worldIndex = ref(-1);
const userWorldIndex = ref(-1);
const diaryList = ref([]);
const formData = ref({
  // --- 基础信息 ---
  name: '', avatar: '', bio: '',
  worldId: '', location: '', occupation: '',
  worldLore: '', 
  

    allowSelfImage: false, // 默认为关闭，帮用户省流
  diaryHistoryLimit: 30, // 默认检索 30 天
    activeMemoryDays: 3,   // ✨ 新增：默认记住最近 3 天
  // --- 核心外貌数据 ---
  appearance: '',       
  appearanceSafe: '',   
  appearanceNsfw: '',   
  
  faceStyle: 'cute', 
  charFeatures: {
      hairColor: '', hairStyle: '', eyeColor: '',
      wearStatus: '正常穿戴',
      topColor: '', topStyle: '',
      bottomColor: '', bottomStyle: '',
      legWear: '',
      skinGloss: '',
      chestSize: '', nippleColor: '',
      waist: '', hips: '', legs: '',
      pubicHair: '', vulvaType: ''
  },
  
  workplace: '',          
  workStartHour: 9,       
  workEndHour: 18,        
  workDays: [1, 2, 3, 4, 5], 

  speakingStyle: '', 
  likes: '',          
  dislikes: '',       
  personalityNormal: '', 

  userNameOverride: '', 
  userRelation: '',     
  userPersona: '',      
  userWorldId: '', userLocation: '', userOccupation: '',
  userAppearance: '', 
  userFeatures: { hair: '', body: '' },

  maxReplies: 1, 
  initialAffection: 10,
  initialLust: 0, 
  
  allowProactive: false,
  proactiveInterval: 4,
  proactiveNotify: false,
  
  historyLimit: 20, enableSummary: false, summaryFrequency: 20, summary: ''
});

onShow(() => {

    applyNativeTheme(); 

   
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

const selectedWorld = computed(() => (worldIndex.value > -1 && worldList.value[worldIndex.value]) ? worldList.value[worldIndex.value] : null);
const selectedUserWorld = computed(() => (userWorldIndex.value > -1 && worldList.value[userWorldIndex.value]) ? worldList.value[userWorldIndex.value] : null);

const getStyleLabel = (key) => FACE_LABELS[key] || key;

const setFeature = (type, key, value) => {
    if (type === 'char') formData.value.charFeatures[key] = value;
    else formData.value.userFeatures[key] = value;
};

const weekDayOptions = [
    { label: '一', value: 1 }, { label: '二', value: 2 }, { label: '三', value: 3 },
    { label: '四', value: 4 }, { label: '五', value: 5 }, { label: '六', value: 6 }, { label: '日', value: 0 }
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
        messages: [{ role: 'user', content: systemInstruction }],
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
        header: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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
        return uni.showToast({ title: '请先填写外观描述或选择特征', icon: 'none' });
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
            }
        
      
        else {
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
    
    formData.value.bio = t.bio;
    formData.value.speakingStyle = t.style;
    formData.value.likes = t.likes;
    formData.value.dislikes = t.dislikes;
    formData.value.personalityNormal = t.logic; 
    
    uni.showToast({ title: `已应用: ${t.label}`, icon: 'none' });
};

onLoad((options) => {
	// 🔥 2. 在 onLoad 顶部加入这段：读取配置，更新按钮显示的文字
	  const savedImgConfig = uni.getStorageSync('app_image_config');
	  if (savedImgConfig && savedImgConfig.provider) {
	      imgProvider.value = savedImgConfig.provider;
	  }
  const storedWorlds = uni.getStorageSync('app_world_settings');
  if (storedWorlds && Array.isArray(storedWorlds)) worldList.value = storedWorlds;

  if (options.id) {
    isEditMode.value = true;
    targetId.value = options.id;
    loadCharacterData(options.id);
    uni.setNavigationBarTitle({ title: '角色设置' });
  } else {
    activeSections.value.basic = true;
  }
});

const handleWorldChange = (e) => {
    worldIndex.value = e.detail.value;
    if (selectedWorld.value) {
        formData.value.worldId = selectedWorld.value.id;
        if (selectedWorld.value.description) formData.value.worldLore = selectedWorld.value.description;
    }
};

const handleUserWorldChange = (e) => {
    userWorldIndex.value = e.detail.value;
    if (selectedUserWorld.value) formData.value.userWorldId = selectedUserWorld.value.id;
};

// AiChat/pages/create/create.vue

const loadCharacterData = async (id) => { // 🌟 必须加 async
    const list = uni.getStorageSync('contact_list') || [];
    const target = list.find(item => String(item.id) === String(id));
    if (target) {
        formData.value.name = target.name;
        formData.value.avatar = target.avatar;
        formData.value.worldId = target.worldId || '';
        formData.value.location = target.location || '';
        formData.value.occupation = target.occupation || (target.settings && target.settings.occupation) || '';

        if (target.settings) {
			formData.value.allowSelfImage = target.settings.allowSelfImage === true;
            formData.value.userNameOverride = target.settings.userNameOverride || '';
            formData.value.userRelation = target.settings.userRelation || '';
            formData.value.userPersona = target.settings.userPersona || '';
            formData.value.workplace = target.settings.workplace || '';
            formData.value.workStartHour = target.settings.workStartHour !== undefined ? target.settings.workStartHour : 9;
            formData.value.workEndHour = target.settings.workEndHour !== undefined ? target.settings.workEndHour : 18;
            formData.value.workDays = target.settings.workDays || [1, 2, 3, 4, 5];
            
            formData.value.appearance = target.settings.appearance || '';
            formData.value.appearanceSafe = target.settings.appearanceSafe || '';
            formData.value.appearanceNsfw = target.settings.appearanceNsfw || '';
            formData.value.faceStyle = target.settings.faceStyle || 'cute';
            
            formData.value.bio = target.settings.bio || '';
            formData.value.speakingStyle = target.settings.speakingStyle || ''; 
            formData.value.likes = target.settings.likes || '';                  
            formData.value.dislikes = target.settings.dislikes || '';            
            formData.value.personalityNormal = target.settings.personalityNormal || '';
            
            formData.value.userWorldId = target.settings.userWorldId || '';
            formData.value.userLocation = target.settings.userLocation || '';
            formData.value.userOccupation = target.settings.userOccupation || '';
            formData.value.userAppearance = target.settings.userAppearance || '';
            formData.value.worldLore = target.settings.worldLore || '';
            
            if (target.settings.charFeatures) formData.value.charFeatures = { ...formData.value.charFeatures, ...target.settings.charFeatures };
            if (target.settings.userFeatures) {
                formData.value.userFeatures = { ...formData.value.userFeatures, ...target.settings.userFeatures };
                
                // 🔥🔥🔥 新增：强制清洗旧数据的残留 🔥🔥🔥
                delete formData.value.userFeatures.privates; 
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

        formData.value.maxReplies = target.maxReplies || 1;
        formData.value.initialAffection = target.initialAffection !== undefined ? target.initialAffection : 10;
        formData.value.initialLust = target.initialLust !== undefined ? target.initialLust : 0;
        
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
                diaryList.value = dbLogs.map(l => ({ ...l, expanded: false }));
            }
        } catch (e) {
            console.error('加载数据库日记列表失败', e);
        }

        // 读取 AI 可见日记目录的天数限制
        formData.value.diaryHistoryLimit = target.diaryHistoryLimit !== undefined ? target.diaryHistoryLimit : 30;
		formData.value.activeMemoryDays = target.activeMemoryDays !== undefined ? target.activeMemoryDays : 3;
    }
};

const getInitialGameTime = () => {
    const now = new Date();
    now.setHours(8, 0, 0, 0); 
    return now.getTime();
};

// AiChat/pages/create/create.vue

const saveCharacter = () => {
  if (!formData.value.name.trim()) return uni.showToast({ title: '名字不能为空', icon: 'none' });
  
  let list = uni.getStorageSync('contact_list') || [];
  
  let clothingStr = '便服';
  if (formData.value.charFeatures.topStyle || formData.value.charFeatures.bottomStyle) {
      clothingStr = `${formData.value.charFeatures.topStyle || ''} + ${formData.value.charFeatures.bottomStyle || ''}`;
  }
  
  const charData = {
    name: formData.value.name,
    avatar: formData.value.avatar || '/static/ai-avatar.png',
    maxReplies: formData.value.maxReplies,
    initialAffection: formData.value.initialAffection,
    initialLust: formData.value.initialLust, 
    allowProactive: formData.value.allowProactive,
    proactiveInterval: formData.value.proactiveInterval,
    proactiveNotify: formData.value.proactiveNotify,
    historyLimit: formData.value.historyLimit, 
    // 🌟 关键：保存“可见天数”设置到存档，供 Agent 读取
    diaryHistoryLimit: formData.value.diaryHistoryLimit, 
	activeMemoryDays: formData.value.activeMemoryDays,
    enableSummary: formData.value.enableSummary,
    summaryFrequency: formData.value.summaryFrequency,
    summary: formData.value.summary,
    location: formData.value.location,
    clothing: clothingStr, 
    worldId: formData.value.worldId, 
    occupation: formData.value.occupation,
    settings: {
		allowSelfImage: formData.value.allowSelfImage, // 保存开关状态
        appearance: formData.value.appearance, 
        appearanceSafe: formData.value.appearanceSafe,
        appearanceNsfw: formData.value.appearanceNsfw,
        faceStyle: formData.value.faceStyle,
        charFeatures: formData.value.charFeatures, 
        userNameOverride: formData.value.userNameOverride,
        userRelation: formData.value.userRelation,
        userPersona: formData.value.userPersona,
        workplace: formData.value.workplace,
        workStartHour: formData.value.workStartHour,
        workEndHour: formData.value.workEndHour,
        workDays: formData.value.workDays,
        bio: formData.value.bio,
        speakingStyle: formData.value.speakingStyle, 
        likes: formData.value.likes,                  
        dislikes: formData.value.dislikes,            
        occupation: formData.value.occupation, 
        userWorldId: formData.value.userWorldId,
        userLocation: formData.value.userLocation,
        userOccupation: formData.value.userOccupation,
        userAppearance: formData.value.userAppearance, 
        userFeatures: formData.value.userFeatures,
        worldLore: formData.value.worldLore,
        personalityNormal: formData.value.personalityNormal,
    },
    lastMsg: isEditMode.value ? undefined : '新角色已创建', 
    lastTime: isEditMode.value ? undefined : '刚刚',
    unread: isEditMode.value ? undefined : 0
  };

  if (isEditMode.value) {
    const index = list.findIndex(item => String(item.id) === String(targetId.value));
    if (index !== -1) {
        list[index] = { ...list[index], ...charData };
        uni.showToast({ title: '修改已保存', icon: 'success' });
    }
  } else {
    const newChar = { 
        id: Date.now(), ...charData, 
        affection: formData.value.initialAffection, 
        lust: formData.value.initialLust, 
        lastTimeTimestamp: getInitialGameTime(), 
        unread: 0,
        relation: '初始状态：尚未产生互动，请严格基于[背景故事(Bio)]判定与玩家的初始关系。'
    };
    list.unshift(newChar);
    uni.showToast({ title: '创建成功', icon: 'success' });
  }
  uni.setStorageSync('contact_list', list);
  setTimeout(() => { uni.navigateBack(); }, 800);
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

        let list = uni.getStorageSync('contact_list') || [];
        const index = list.findIndex(item => String(item.id) === cid);
        
        if (index !== -1) {
          const currentRole = list[index];
          const preservedTime = currentRole.lastTimeTimestamp || getInitialGameTime();
          
          let clothingStr = '便服';
          if (formData.value.charFeatures.topStyle || formData.value.charFeatures.bottomStyle) {
              clothingStr = `${formData.value.charFeatures.topStyle || ''} + ${formData.value.charFeatures.bottomStyle || ''}`;
          }

          const resetData = {
              lastMsg: '（记忆已清空）', 
              lastTime: '刚刚',
              lastTimeTimestamp: preservedTime, 
              unread: 0, 
              summary: '', 
              currentLocation: formData.value.location || '角色家',
              interactionMode: 'phone', 
              clothing: clothingStr,
              lastActivity: '自由活动', 
              affection: formData.value.initialAffection || 10,
              lust: formData.value.initialLust || 0,
              relation: '初始状态：尚未产生互动，请严格基于[背景故事(Bio)]判定与玩家的初始关系。', 
          };

          list[index] = { ...list[index], ...resetData };
          uni.setStorageSync('contact_list', list);
          
          // ✨ 清空当前页面的日记列表显示
          if (typeof diaryList !== 'undefined') diaryList.value = [];

          uni.showToast({ title: '重置成功', icon: 'success' });
          setTimeout(() => { uni.navigateBack(); }, 800);
        } else {
            uni.showToast({ title: '未找到角色数据', icon: 'none' });
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
    background-color: var(--bg-color); /* 适配全局背景 */
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
    background-color: var(--card-bg); /* 适配卡片背景 */
    margin-top: 24rpx; 
    overflow: hidden; 
}

.section-header { 
    padding: 30rpx; 
    display: flex; justify-content: space-between; align-items: center; 
    border-bottom: 1px solid var(--border-color); /* 适配边框 */
    transition: background-color 0.2s;
}

.section-header:active { 
    background-color: var(--tool-bg); /* 点击态 */
}

.section-title-wrapper { display: flex; flex-direction: column; }

.section-title { 
    font-size: 32rpx; font-weight: bold; 
    color: var(--text-color); /* 适配文字 */
    border-left: 8rpx solid #007aff; 
    padding-left: 20rpx; 
}

.section-subtitle { 
    font-size: 22rpx; 
    color: var(--text-sub); /* 适配副标题 */
    margin-left: 28rpx; margin-top: 8rpx; 
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

@keyframes slideDown { from { opacity: 0; transform: translateY(-10rpx); } to { opacity: 1; transform: translateY(0); } }

/* ==========================================================================
   3. 子板块与分组 (Sub Group)
   ========================================================================== */
.sub-group { 
    border: 2rpx dashed var(--border-color); /* 虚线适配 */
    border-radius: 12rpx; margin-bottom: 24rpx; 
    background-color: var(--tool-bg); /* 子板块底色略深 */
    overflow: hidden; 
}

.sub-header { 
    padding: 20rpx; 
    display: flex; justify-content: space-between; align-items: center; 
    background-color: var(--pill-bg); /* 标题栏背景 */
    border-bottom: 1px solid var(--border-color); 
}

.sub-title { 
    font-size: 26rpx; font-weight: bold; 
    color: var(--text-color); /* 适配 */
}

.sub-arrow { font-size: 22rpx; color: var(--text-sub); }
.sub-content { padding: 20rpx; }

/* 分类块 */
.category-block { 
    margin-bottom: 30rpx; 
    border-bottom: 1px solid var(--border-color); 
    padding-bottom: 20rpx; 
}
.category-block:last-child { border-bottom: none; }

.block-title { 
    font-size: 28rpx; font-weight: bold; 
    color: #333; /* 保持深色，因为背景是黄色的 */
    margin-bottom: 20rpx; display: block; 
    border-left: 6rpx solid #ffd700; padding-left: 12rpx; 
    background-color: #fff9e6; /* 黄色高亮保持不变，或者夜间调暗 */
    padding-top: 4rpx; padding-bottom: 4rpx; 
    border-radius: 4rpx;
}

/* ==========================================================================
   4. 特征标签 (Chips)
   ========================================================================== */
.feature-row { margin-bottom: 20rpx; display: flex; flex-direction: column; }
.feat-label { font-size: 24rpx; color: var(--text-sub); margin-bottom: 10rpx; }

.chips-scroll { white-space: nowrap; width: 100%; }
.chips-flex { display: flex; gap: 12rpx; padding-bottom: 4rpx; align-items: center; }

.chip { 
    display: inline-block; padding: 10rpx 24rpx; 
    background-color: var(--card-bg); /* 适配 */
    border: 1px solid var(--border-color); 
    border-radius: 8rpx; font-size: 24rpx; 
    color: var(--text-color); 
    transition: all 0.2s; 
    box-shadow: var(--shadow);
}

.chip.active { 
    background-color: rgba(0, 122, 255, 0.1); /* 适配激活态 */
    color: #007aff; 
    border-color: #007aff; 
    font-weight: bold; 
    box-shadow: 0 2rpx 6rpx rgba(0,122,255,0.2); 
}

.chip-warn.active { 
    background-color: rgba(211, 47, 47, 0.1); 
    color: #d32f2f; border-color: #d32f2f; 
}

.style-chip { padding: 12rpx 20rpx; }
.separator { color: var(--border-color); font-size: 20rpx; margin: 0 4rpx; }

/* ==========================================================================
   5. 输入框与控件
   ========================================================================== */
.input-item, .textarea-item { margin-bottom: 30rpx; }
.label { display: block; font-size: 28rpx; color: var(--text-sub); margin-bottom: 16rpx; }
.label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }

.gen-btn { 
    background-color: #007aff; color: #fff; 
    font-size: 24rpx; padding: 6rpx 20rpx; border-radius: 30rpx; 
    transition: all 0.3s;
}
.gen-btn.disabled { opacity: 0.6; background-color: #999; pointer-events: none; cursor: not-allowed; }
.mini-btn-gen { background-color: var(--text-color); color: var(--card-bg); font-size: 24rpx; margin-top: 20rpx; border-radius: 40rpx; }

.input { 
    background-color: var(--input-bg); /* 适配输入框背景 */
    height: 80rpx; padding: 0 20rpx; border-radius: 10rpx; 
    font-size: 30rpx; color: var(--text-color);
    border: 1px solid var(--border-color);
}

.picker-box { 
    background-color: var(--input-bg); 
    height: 80rpx; padding: 0 20rpx; border-radius: 10rpx; 
    font-size: 30rpx; line-height: 80rpx; 
    color: var(--text-color);
    border: 1px solid var(--border-color);
}

.textarea { 
    background-color: var(--input-bg); 
    width: 100%; padding: 20rpx; border-radius: 10rpx; 
    font-size: 30rpx; color: var(--text-color);
    height: 160rpx; box-sizing: border-box; 
    border: 1px solid var(--border-color);
}
.textarea.large { height: 240rpx; }

.memory-box { 
    border: 2rpx dashed #9b59b6; 
    background-color: rgba(155, 89, 182, 0.05); /* 适配 */
    color: var(--text-sub); 
    line-height: 1.6; 
}

.tip { font-size: 24rpx; color: var(--text-sub); margin-top: 10rpx; display: block; line-height: 1.5; }
.setting-tip { 
    font-size: 24rpx; margin-bottom: 20rpx; padding: 10rpx; border-radius: 8rpx; 
    background: rgba(46, 204, 113, 0.1); color: #2ecc71; /* 绿色提示保持醒目 */
}

/* 头像预览 */
.avatar-preview-box { margin-top: 20rpx; display: flex; justify-content: center; }
.avatar-preview { 
    width: 160rpx; height: 160rpx; border-radius: 20rpx; 
    border: 2px solid var(--border-color); background: var(--card-bg); 
}
.avatar-placeholder { 
    width: 160rpx; height: 160rpx; border-radius: 20rpx; 
    background: var(--input-bg); 
    display: flex; align-items: center; justify-content: center; 
    border: 2px dashed var(--text-sub); 
}
.avatar-emoji { font-size: 60rpx; }

/* 快速标签 */
.quick-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.tag { 
    background-color: rgba(0, 122, 255, 0.1); color: #007aff; 
    padding: 8rpx 20rpx; border-radius: 30rpx; font-size: 24rpx; 
    border: 1px solid transparent; 
}
.job-tag { background-color: rgba(156, 39, 176, 0.1); color: #9c27b0; }

/* ==========================================================================
   6. 底部操作区
   ========================================================================== */
.bottom-area { 
    padding: 20rpx 30rpx; 
    background-color: var(--card-bg); /* 适配 */
    border-top: 1px solid var(--border-color); 
    padding-bottom: calc(20rpx + constant(safe-area-inset-bottom)); 
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); 
}

.save-btn { background-color: #007aff; color: #fff; border-radius: 40rpx; font-size: 32rpx; }
.clear-btn { 
    background-color: rgba(255, 71, 87, 0.1); 
    color: #ff4757; font-size: 30rpx; 
    border: 1px solid #ff4757; width: 100%; 
}

.slider-header { display: flex; justify-content: space-between; align-items: center; }
.help-text { font-size: 22rpx; color: var(--text-sub); margin-bottom: 12rpx; }

/* ==========================================================================
   7. 特定组件：风格卡片 & 时间选择器
   ========================================================================== */
/* 迷你风格卡片 */
.style-mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-bottom: 20rpx; }
.style-mini-card { 
    background: var(--input-bg); 
    border: 1px solid var(--border-color); 
    border-radius: 8rpx; padding: 12rpx 0; text-align: center; 
    font-size: 22rpx; color: var(--text-sub); 
}
.style-mini-card.active { 
    border-color: #e67e22; 
    background-color: rgba(255, 243, 224, 0.1); /* 适配 */
    color: #d35400; font-weight: bold; 
}

/* 时间范围输入框 */
.time-range-box { display: flex; align-items: center; gap: 20rpx; }
.time-input-wrapper {
    display: flex; align-items: center;
    background: var(--input-bg);
    padding: 12rpx 24rpx; border-radius: 12rpx;
    border: 1px solid var(--border-color);
}
.mini-input {
    width: 60rpx; text-align: center; font-weight: bold; font-size: 30rpx;
    color: var(--text-color);
}
.suffix { color: var(--text-sub); font-size: 24rpx; margin-left: 4rpx; }

/* 星期选择器 */
.weekday-selector { display: flex; gap: 16rpx; flex-wrap: wrap; margin-top: 10rpx; }
.day-chip {
    width: 72rpx; height: 72rpx; border-radius: 50%;
    background: var(--tool-bg);
    color: var(--text-sub);
    display: flex; align-items: center; justify-content: center;
    font-size: 24rpx; transition: all 0.2s;
    border: 2px solid transparent;
}
.day-chip.active {
    background: rgba(0, 122, 255, 0.1);
    color: #007aff; border-color: #007aff;
    font-weight: bold;
    box-shadow: 0 2rpx 6rpx rgba(0,122,255,0.2);
}
.tip-text { font-size: 22rpx; color: var(--text-sub); margin-top: 12rpx; display: block; }

/* 自定义输入框 */
.input-row { margin-bottom: 12rpx; }
.mini-input-text {
    width: 100%; height: 60rpx;
    background: var(--input-bg);
    border-radius: 8rpx; padding: 0 20rpx;
    font-size: 26rpx; color: var(--text-color);
    border: 1px solid var(--border-color);
    box-sizing: border-box;
}
.mini-input-text:focus {
    background: var(--card-bg);
    border-color: #007aff;
}
</style>