<template>
  <view class="create-container">
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
                          <text class="feat-label">画风锁定 (Style)</text>
                          <view class="input-row">
                              <input class="mini-input-text" v-model="formData.faceStyle" placeholder="选择或输入 (如: flat color)" />
                          </view>
                          <view class="tip" style="margin-bottom: 10rpx;">自定义提示：可填 1990s (复古), sketch (素描), oil painting (油画) 等。</view>
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
                      <text class="block-title" style="color: #ff6b81;">E. 秘密花园 (NSFW)</text>
                      
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
                <view class="gen-btn" @click="generateAvatar" hover-class="gen-btn-hover">🎨 ComfyUI 生成</view>
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
                   <view class="category-block">
                        <text class="block-title">下体特征 (NSFW)</text>
                        <view class="feature-row">
                           <text class="feat-label">尺寸/状态</text>
                           <scroll-view scroll-x class="chips-scroll">
                               <view class="chips-flex">
                                   <view v-for="item in OPTIONS.malePrivate" :key="item" class="chip" :class="{active: formData.userFeatures.privates === item}" @click="setFeature('user', 'privates', item)">{{item}}</view>
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

           <view class="textarea-item" style="margin-top: 20rpx;">
             <text class="label">🧠 核心行为逻辑 (Behavior Logic)</text>
             <view class="help-text">这里决定了她是个什么样的人。是见面就白给，还是高冷到底。全靠这段描述。</view>
             <textarea class="textarea large" style="height: 300rpx;" v-model="formData.personalityNormal" placeholder="AI将严格遵循此逻辑行动..." maxlength="-1" />
           </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-header" @click="toggleSection('init')">
          <view class="section-title-wrapper"><view class="section-title">初始状态设置</view></view>
          <text class="arrow-icon">{{ activeSections.init ? '▼' : '▶' }}</text>
        </view>
        <view v-show="activeSections.init" class="section-content">
             <view class="input-item" style="border-top: 1px dashed #eee; padding-top: 20rpx; margin-top: 20rpx;">
                  <view class="label-row">
                      <text class="label">🤖 允许角色主动找我</text>
                      <switch :checked="formData.allowProactive" @change="(e) => formData.allowProactive = e.detail.value" color="#007aff"/>
                  </view>
                  
                  <template v-if="formData.allowProactive">
                      <view class="slider-header" style="margin-top: 20rpx;">
                          <text class="label">主动间隔: {{ formData.proactiveInterval }} 小时</text>
                      </view>
                      <slider :value="formData.proactiveInterval" min="1" max="48" step="1" show-value activeColor="#007aff" @change="(e) => formData.proactiveInterval = e.detail.value" />
                      <view class="tip">当您离开 App 超过这个时间，角色可能会主动发消息。</view>

                      <view class="label-row" style="margin-top: 20rpx;">
                          <text class="label">🔔 开启系统弹窗通知</text>
                          <switch :checked="formData.proactiveNotify" @change="(e) => formData.proactiveNotify = e.detail.value" color="#ff9f43"/>
                      </view>
                      <view class="tip" v-if="formData.proactiveNotify">需在手机设置中允许 App 通知权限。</view>
                  </template>
             </view>
        </view>
      </view>
      
      <view class="form-section">
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
import { onLoad } from '@dcloudio/uni-app';
import { saveToGallery } from '@/utils/gallery-save.js';
import { COMFY_WORKFLOW_TEMPLATE } from '@/utils/constants.js';

// =========================================================================
// 1. 常量定义
// =========================================================================

const FACE_STYLES_MAP = {
    'cute': 'cute face, childlike face, round face, large sparkling eyes, doe eyes, small nose, soft cheeks, big head small body ratio, kawaii',
    'cool': 'mature face, sharp eyes, narrow eyes, long eyelashes, perfect eyebrows, pale skin, defined jawline, elegant features, intimidating beauty',
    'sexy': 'mature beauty, milf, mature female face, slight crow’s feet, defined cheekbones, full lips, lipstick, heavy makeup, mole under eye, long loose hair, ara ara',
    'energetic': 'wide open eyes, bright eyes, fang, ahoge, messy hair, vivid eyes, sun-kissed skin, energetic vibe',
    'emotionless': 'pale skin, straight bangs, flat chest, doll-like face, empty eyes, lifeless eyes',
    'yandere': 'shadowed face, sanpaku eyes, dark circles under eyes, sickly pale skin, hollow eyes'
};

const FACE_LABELS = {
    'cute': '🍭 可爱/幼态',
    'cool': '❄️ 高冷/御姐',
    'sexy': '💋 成熟/人妻',
    'energetic': '🌟 元气/活泼',
    'emotionless': '😐 三无/冷淡',
    'yandere': '🔪 病娇/黑化'
};

// 🌟 常量更新：拆分发色/发型，拆分上下装，拆分下身部位，隐晦NSFW
const OPTIONS = {
    hairColor: ['黑色', '银白', '金色', '粉色', '红色', '蓝色', '紫色', '棕色'],
    hairStyle: ['长直发', '大波浪', '双马尾', '短发', '姬发式', '丸子头', '单马尾', '凌乱发'],
    eyeColor: ['红色', '蓝色', '金色', '绿色', '紫色', '黑色', '异色'],
    wearStatus: ['正常穿戴', '暴露/H'], 
    
    // 上装 (Top)
    topStyle: ['T恤', '衬衫', '毛衣', '吊带背心', '抹胸', '比基尼上衣', '运动内衣', '水手服上衣', '旗袍上身', '透视衫'],
    // 下装 (Bottom)
    bottomStyle: ['百褶裙', '牛仔短裤', '瑜伽裤', '包臀裙', '比基尼泳裤', '蕾丝内裤', '丁字裤(T-back)', '开档内裤', '运动短裤', '牛仔长裤'],
    
    clothingColor: ['白色', '黑色', '粉色', '蓝色', '红色', '紫色', '黑白相间'],
    legWear: ['光腿', '白丝袜', '黑丝袜', '网眼袜', '过膝袜', '短袜', '腿环'],
    skinGloss: ['自然哑光', '柔嫩白皙', '水润微光', '油亮光泽', '汗湿淋漓', '晒痕'],
    chestSize: ['贫乳(Flat)', '微乳(Small)', '丰满(Medium)', '巨乳(Large)', '爆乳(Huge)'],
    
    // NSFW 隐晦版
    nippleColor: ['淡粉色', '粉红', '红润', '深褐色', '肿胀'],
    waist: ['纤细腰身', '柔软腰肢', '丰满腰臀', '马甲线', '人鱼线'],
    hips: ['丰满圆润', '挺翘', '安产型宽胯', '肉感'],
    legs: ['纤细长腿', '肉感大腿', '筷子腿', '肌肉线条'],
    
    // 隐晦词汇 (UI显示用，Prompt逻辑里还是会翻译成对应的Tag)
    pubicHair: ['白虎(无毛)', '一线天', '修剪整齐', '自然茂盛', '爱心形状'], 
    vulvaType: ['馒头型(饱满)', '粉嫩(Pink)', '紧致', '湿润(Wet)', '蝴蝶型(外翻)'],
    
    maleHair: ['黑色短发', '棕色碎发', '寸头', '中分', '狼尾', '遮眼发'],
    maleBody: ['身材匀称', '肌肉结实', '清瘦', '略胖', '高大威猛', '腹肌明显'],
    malePrivate: ['干净无毛', '修剪整齐', '浓密自然', '尺寸惊人', '青筋暴起']
};

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
// 2. 状态管理
// =========================================================================

const isEditMode = ref(false);
const targetId = ref(null);
const currentTemplateKey = ref('');

// 界面折叠状态
const activeSections = ref({ basic: false, player: false, core: false, init: false, memory: false, danger: false });
const toggleSection = (key) => { activeSections.value[key] = !activeSections.value[key]; };

// 🌟 更新：subSections 增加了 charWork
const subSections = ref({ charWorld: false, charWork: false, charLooks: false, userWorld: false, userLooks: false });
const toggleSubSection = (key) => { subSections.value[key] = !subSections.value[key]; };

const worldList = ref([]);
const worldIndex = ref(-1);
const userWorldIndex = ref(-1);

const tempClothingTagsForAvatar = ref('');

const formData = ref({
  // --- 基础信息 ---
  name: '', avatar: '', bio: '',
  worldId: '', location: '', occupation: '',
  worldLore: '', 
  
  // --- 核心外貌数据 ---
  appearance: '',       
  appearanceSafe: '',   
  appearanceNsfw: '',   
  
  faceStyle: 'cute', 
  // 🌟 数据结构更新：适配拆分后的特征
  charFeatures: {
      hairColor: '', hairStyle: '', eyeColor: '',
      wearStatus: '正常穿戴',
      
      // 上装
      topColor: '', topStyle: '',
      // 下装
      bottomColor: '', bottomStyle: '',
      legWear: '',
      
      skinGloss: '',
      chestSize: '', nippleColor: '',
      
      // 下身拆分
      waist: '', hips: '', legs: '',
      
      pubicHair: '', vulvaType: ''
  },
  
  // 工作与作息
  workplace: '',          
  workStartHour: 9,       
  workEndHour: 18,        
  workDays: [1, 2, 3, 4, 5], 

  // 细节
  speakingStyle: '', 
  likes: '',          
  dislikes: '',       
  
  personalityNormal: '', 

  // 玩家设定
  userNameOverride: '', 
  userRelation: '',     
  userPersona: '',      
  userWorldId: '', userLocation: '', userOccupation: '',
  userAppearance: '', 
  userFeatures: { hair: '', body: '', privates: '' },

  // 系统设置
  maxReplies: 1, 
  initialAffection: 10,
  initialLust: 0, 
  
  allowProactive: false,
  proactiveInterval: 4,
  proactiveNotify: false,
  
  historyLimit: 20, enableSummary: false, summaryFrequency: 20, summary: ''
});

const selectedWorld = computed(() => (worldIndex.value > -1 && worldList.value[worldIndex.value]) ? worldList.value[worldIndex.value] : null);
const selectedUserWorld = computed(() => (userWorldIndex.value > -1 && worldList.value[userWorldIndex.value]) ? worldList.value[userWorldIndex.value] : null);

const getStyleLabel = (key) => FACE_LABELS[key] || key;

const setFeature = (type, key, value) => {
    if (type === 'char') formData.value.charFeatures[key] = value;
    else formData.value.userFeatures[key] = value;
};

const weekDayOptions = [
    { label: '一', value: 1 },
    { label: '二', value: 2 },
    { label: '三', value: 3 },
    { label: '四', value: 4 },
    { label: '五', value: 5 },
    { label: '六', value: 6 },
    { label: '日', value: 0 }
];

const toggleWorkDay = (val) => {
    const idx = formData.value.workDays.indexOf(val);
    if (idx > -1) {
        formData.value.workDays.splice(idx, 1);
    } else {
        formData.value.workDays.push(val);
    }
};

const getCurrentLlmConfig = () => {
    const schemes = uni.getStorageSync('app_llm_schemes') || [];
    const idx = uni.getStorageSync('app_current_scheme_index') || 0;
    if (schemes.length > 0 && schemes[idx]) {
        return schemes[idx];
    }
    return null;
};

// =========================================================================
// 3. API 与 生成逻辑
// =========================================================================

const performLlmRequest = async (prompt, customSystem = null) => {
    const chatConfig = getCurrentLlmConfig();
    if (!chatConfig || !chatConfig.apiKey) {
        throw new Error('未配置 API Key');
    }

    let baseUrl = chatConfig.baseUrl || '';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    let targetUrl = '';
    let method = 'POST';
    let headers = { 'Content-Type': 'application/json' };
    let requestData = {};

    const systemInstruction = customSystem || "You are a prompt translator. Output only English tags.";

    if (chatConfig.provider === 'gemini') {
        const cleanBase = 'https://generativelanguage.googleapis.com'; 
        targetUrl = `${cleanBase}/v1beta/models/${chatConfig.model}:generateContent?key=${chatConfig.apiKey}`;
        requestData = {
            contents: [{
                parts: [{ text: `${systemInstruction}\n\nTask: ${prompt}` }]
            }]
        };
    } else {
        headers['Authorization'] = `Bearer ${chatConfig.apiKey}`;
        targetUrl = `${baseUrl}/chat/completions`;
        requestData = {
            model: chatConfig.model,
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
            ],
            max_tokens: customSystem ? 1000 : 300,
            stream: false
        };
    }

    const res = await uni.request({
        url: targetUrl, method: method, header: headers, data: requestData, sslVerify: false
    });

    if (res.statusCode === 429) {
        throw new Error('请求太频繁 (429)。请稍后再试或检查 API 配额。');
    }

    let resultText = '';
    if (chatConfig.provider === 'gemini') {
        if (res.statusCode === 200 && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            resultText = res.data.candidates[0].content.parts[0].text;
        } else {
            throw new Error(`Gemini API 错误 (${res.statusCode})`);
        }
    } else {
        let responseData = res.data;
        if (typeof responseData === 'string') { try { responseData = JSON.parse(responseData); } catch (e) {} }
        if (res.statusCode === 200 && responseData?.choices?.[0]?.message?.content) {
            resultText = responseData.choices[0].message.content;
        } else {
            throw new Error(`API 错误 (${res.statusCode})`);
        }
    }

    return resultText.trim();
};

// 🌟 逻辑更新：适配上下装拆分
const generateEnglishPrompt = async () => {
    const f = formData.value.charFeatures;
    const faceTags = FACE_STYLES_MAP[formData.value.faceStyle] || '';
    
    // 1. 身体特征 (Safe)
    let safeParts = [];
    if (f.hairColor || f.hairStyle) safeParts.push(`${f.hairColor || ''}${f.hairStyle || ''}`);
    if (f.eyeColor) safeParts.push(`${f.eyeColor}眼睛`);
    if (f.skinGloss) safeParts.push(`皮肤${f.skinGloss}`);
    if (f.chestSize) safeParts.push(`胸部${f.chestSize}`);
    
    // 新的下身特征拼接
    if (f.waist) safeParts.push(f.waist);
    if (f.hips) safeParts.push(f.hips);
    if (f.legs) safeParts.push(f.legs);
    
    const safeChinese = safeParts.join('，');

    // 2. 私密特征 (NSFW)
    let nsfwParts = [];
    if (f.nippleColor) nsfwParts.push(`乳头${f.nippleColor}`);
    if (f.pubicHair || f.vulvaType) nsfwParts.push(`私处${f.pubicHair || ''}，${f.vulvaType || ''}`);
    const nsfwChinese = nsfwParts.join('，');

    // 3. 衣服 (Clothes) - 拼接上下装
    let clothesParts = [];
    if (f.topStyle) clothesParts.push(`上身穿着${f.topColor || ''}${f.topStyle}`);
    if (f.bottomStyle) clothesParts.push(`下身穿着${f.bottomColor || ''}${f.bottomStyle}`);
    
    if (clothesParts.length === 0) clothesParts.push('穿着日常便服');
    
    if (f.legWear) clothesParts.push(`穿着${f.legWear}`);
    const clothesChinese = clothesParts.join('，');
    
    if (!safeChinese && !clothesChinese) {
        return uni.showToast({ title: '请先选择特征', icon: 'none' });
    }

    uni.showLoading({ title: '生成纯净人设Prompt...', mask: true });

    try {
        const prompt = `Translate these 3 parts from Chinese to Danbooru English tags.
        Separate the parts with "|||".
        
        Part 1 (Body): "${safeChinese}"
        Part 2 (NSFW Details): "${nsfwChinese}"
        Part 3 (Clothing): "${clothesChinese}"
        
        Rules:
        1. Use specific tags (e.g. 'sweater', 'plaid skirt', 'pantyhose').
        2. Output ONLY the tags.
        3. Format: Part1Tags ||| Part2Tags ||| Part3Tags`;
        
        const result = await performLlmRequest(prompt);
        
        const parts = result.split('|||');
        const safeTags = parts[0] ? parts[0].trim() : '';
        const nsfwTags = parts[1] ? parts[1].trim() : '';
        const clothingTags = parts[2] ? parts[2].trim() : ''; 
        
        formData.value.appearanceSafe = `${faceTags}, ${safeTags}`.replace(/,\s*,/g, ',').trim();
        formData.value.appearanceNsfw = nsfwTags;
        
        if (f.wearStatus === '暴露/H') {
             formData.value.appearance = `${formData.value.appearanceSafe}, ${nsfwTags}`;
        } else {
             formData.value.appearance = `${formData.value.appearanceSafe}`;
        }

        tempClothingTagsForAvatar.value = clothingTags;

        uni.showToast({ title: 'Prompt已生成 (不含衣物)', icon: 'success' });
    } catch (e) {
        console.error(e);
        formData.value.appearance = `${faceTags}, ${safeChinese}`; 
        formData.value.appearanceSafe = `${faceTags}, ${safeChinese}`; 
        tempClothingTagsForAvatar.value = clothesChinese;
        uni.showToast({ title: '翻译失败，使用原文', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

const generateUserDescription = async () => {
    const f = formData.value.userFeatures;
    let tags = [];
    if (f.hair) tags.push(f.hair);
    if (f.body) tags.push(f.body);
    if (f.privates) tags.push(`下体${f.privates}`);
    
    const rawKeywords = tags.join('，');
    if (!rawKeywords) return uni.showToast({ title: '请先选择特征', icon: 'none' });

    uni.showLoading({ title: '生成中...', mask: true });

    try {
        const prompt = `Translate to English tags: "${rawKeywords}". Start with "1boy". Output ONLY tags.`;
        const result = await performLlmRequest(prompt);
        formData.value.userAppearance = result;
        uni.showToast({ title: '成功', icon: 'success' });
    } catch (e) {
        formData.value.userAppearance = `1boy, ${rawKeywords}`;
        uni.showToast({ title: e.message || '生成失败', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

const generateImageFromComfyUI = async (promptText, baseUrl) => {
    const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE));
    workflow["3"].inputs.text = promptText;
    workflow["5"].inputs.seed = Math.floor(Math.random() * 999999999999999);
    try {
        const queueRes = await uni.request({
            url: `${baseUrl}/prompt`, method: 'POST', header: { 'Content-Type': 'application/json' },
            data: { prompt: workflow }, sslVerify: false
        });
        if (queueRes.statusCode !== 200) throw new Error(`队列请求失败: ${queueRes.statusCode}`);
        const promptId = queueRes.data.prompt_id;
        for (let i = 0; i < 60; i++) { 
            await new Promise(r => setTimeout(r, 1000));
            const historyRes = await uni.request({ url: `${baseUrl}/history/${promptId}`, method: 'GET', sslVerify: false });
            if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
                const outputs = historyRes.data[promptId].outputs;
                if (outputs && outputs["16"] && outputs["16"].images.length > 0) {
                    const imgInfo = outputs["16"].images[0];
                    return `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`;
                }
            }
        }
        throw new Error('生成超时');
    } catch (e) { throw e; }
};

const generateAvatar = async () => {
  if (!formData.value.appearance.trim()) return uni.showToast({ title: '请先生成 Prompt', icon: 'none' });
  const imgConfig = uni.getStorageSync('app_image_config') || {};
  if (!imgConfig.baseUrl) {
      return uni.showToast({ title: '请在[我的]设置中配置 ComfyUI 地址', icon: 'none' });
  }
  
  uni.showLoading({ title: 'ComfyUI 绘图中...', mask: true });
  
  const clothes = tempClothingTagsForAvatar.value || '';
  const avatarPrompt = `best quality, masterpiece, anime style, cel shading, solo, cowboy shot, upper body, looking at viewer, ${formData.value.appearance}, ${clothes}`;
  
  try {
      const tempUrl = await generateImageFromComfyUI(avatarPrompt, imgConfig.baseUrl);
      if (tempUrl) {
          const saveId = targetId.value || 'temp_create';
          const localPath = await saveToGallery(tempUrl, saveId, formData.value.name || '新角色', avatarPrompt);
          formData.value.avatar = localPath;
          uni.showToast({ title: '成功', icon: 'success' });
      } else { throw new Error("ComfyUI 返回为空"); }
  } catch (e) {
      console.error(e);
      uni.showModal({ title: '错误', content: e.message || '请求异常', showCancel: false });
  } finally { uni.hideLoading(); }
};

// =========================================================================
// 4. 数据加载与处理
// =========================================================================

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
        if (selectedWorld.value.description) {
            formData.value.worldLore = selectedWorld.value.description;
        }
    }
};

const handleUserWorldChange = (e) => {
    userWorldIndex.value = e.detail.value;
    if (selectedUserWorld.value) formData.value.userWorldId = selectedUserWorld.value.id;
};

const loadCharacterData = (id) => {
  const list = uni.getStorageSync('contact_list') || [];
  const target = list.find(item => String(item.id) === String(id));
  if (target) {
    formData.value.name = target.name;
    formData.value.avatar = target.avatar;
    formData.value.worldId = target.worldId || '';
    formData.value.location = target.location || '';
    formData.value.occupation = target.occupation || (target.settings && target.settings.occupation) || '';

    if (target.settings) {
        // 基本设定
        formData.value.userNameOverride = target.settings.userNameOverride || '';
        formData.value.userRelation = target.settings.userRelation || '';
        formData.value.userPersona = target.settings.userPersona || '';
        
        // 工作设定
        formData.value.workplace = target.settings.workplace || '';
        formData.value.workStartHour = target.settings.workStartHour !== undefined ? target.settings.workStartHour : 9;
        formData.value.workEndHour = target.settings.workEndHour !== undefined ? target.settings.workEndHour : 18;
        formData.value.workDays = target.settings.workDays || [1, 2, 3, 4, 5];
        
        // 外貌
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
        if (target.settings.userFeatures) formData.value.userFeatures = { ...formData.value.userFeatures, ...target.settings.userFeatures };
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
  }
};

// 🕒 辅助函数
const getInitialGameTime = () => {
    const now = new Date();
    now.setHours(8, 0, 0, 0); 
    return now.getTime();
};

const saveCharacter = () => {
  if (!formData.value.name.trim()) {
      return uni.showToast({ title: '名字不能为空', icon: 'none' });
  }
  
  let list = uni.getStorageSync('contact_list') || [];
  
  // 构建衣物描述字符串 (用于聊天界面显示)
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
    enableSummary: formData.value.enableSummary,
    summaryFrequency: formData.value.summaryFrequency,
    summary: formData.value.summary,
    
    location: formData.value.location,
    clothing: clothingStr, 
    worldId: formData.value.worldId, 
    occupation: formData.value.occupation,

    // Settings (完整字段)
    settings: {
        appearance: formData.value.appearance, 
        appearanceSafe: formData.value.appearanceSafe,
        appearanceNsfw: formData.value.appearanceNsfw,
        faceStyle: formData.value.faceStyle,
        charFeatures: formData.value.charFeatures, 
        
        userNameOverride: formData.value.userNameOverride,
        userRelation: formData.value.userRelation,
        userPersona: formData.value.userPersona,
        
        // 🌟 核心字段
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
        id: Date.now(), 
        ...charData, 
        
        affection: formData.value.initialAffection, 
        lust: formData.value.initialLust, 
        
        // 🌟 新建时锁定初始时间
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
    content: `将清空聊天记录、重置好感度、位置、状态，并让角色回归【背景设定】的初始状态。确定吗？`, 
    confirmColor: '#ff4757',
    success: (res) => {
      if (res.confirm && targetId.value) {
        uni.removeStorageSync(`chat_history_${targetId.value}`);
        uni.removeStorageSync(`last_real_active_time_${targetId.value}`);
        uni.removeStorageSync(`last_proactive_lock_${targetId.value}`);

        let list = uni.getStorageSync('contact_list') || [];
        const index = list.findIndex(item => String(item.id) === String(targetId.value));
        
        if (index !== -1) {
          const currentRole = list[index];
          // 🌟 重置时保留时间
          const preservedTime = currentRole.lastTimeTimestamp || getInitialGameTime();

          let clothingStr = '便服';
          if (formData.value.charFeatures.topStyle || formData.value.charFeatures.bottomStyle) {
              clothingStr = `${formData.value.charFeatures.topStyle || ''} + ${formData.value.charFeatures.bottomStyle || ''}`;
          }

          const resetData = {
              lastMsg: '（记忆已清除）',
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
          
          uni.showToast({ title: '重置成功', icon: 'success' });
          setTimeout(() => {
              uni.navigateBack();
          }, 800);
        } else {
            uni.showToast({ title: '未找到角色数据', icon: 'none' });
        }
      }
    }
  });
};
</script>

<style lang="scss">
/* 关键修复：确保容器占满屏幕，禁止 Body 滚动 */
.create-container { 
    height: 100vh; 
    display: flex; 
    flex-direction: column; 
    background-color: #f5f7fa; 
    overflow: hidden; 
}

/* 关键修复：Scroll View 必须指定 flex-grow 和 height: 0 来触发 Flex 计算 */
.form-scroll { 
    flex: 1; 
    height: 0; 
    width: 100%;
}

.form-section { background-color: #fff; margin-top: 24rpx; overflow: hidden; }
.section-header { padding: 30rpx; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f9f9f9; }
.section-header:active { background-color: #f9f9f9; }
.section-title-wrapper { display: flex; flex-direction: column; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; border-left: 8rpx solid #007aff; padding-left: 20rpx; }
.section-subtitle { font-size: 22rpx; color: #999; margin-left: 28rpx; margin-top: 8rpx; }
.arrow-icon { color: #ccc; font-size: 24rpx; }
.section-content { padding: 30rpx; animation: slideDown 0.2s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10rpx); } to { opacity: 1; transform: translateY(0); } }

/* 子板块样式 */
.sub-group { border: 2rpx dashed #eee; border-radius: 12rpx; margin-bottom: 24rpx; background-color: #fcfcfc; overflow: hidden; }
.sub-header { padding: 20rpx; display: flex; justify-content: space-between; align-items: center; background-color: #fafafa; border-bottom: 1px solid #eee; }
.sub-title { font-size: 26rpx; font-weight: bold; color: #555; }
.sub-arrow { font-size: 22rpx; color: #ccc; }
.sub-content { padding: 20rpx; }

/* 分类块样式 */
.category-block { margin-bottom: 30rpx; border-bottom: 1px solid #f0f0f0; padding-bottom: 20rpx; }
.category-block:last-child { border-bottom: none; }
.block-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; display: block; border-left: 6rpx solid #ffd700; padding-left: 12rpx; background-color: #fff9e6; padding-top: 4rpx; padding-bottom: 4rpx; }

/* 特征行样式 */
.feature-row { margin-bottom: 20rpx; display: flex; flex-direction: column; }
.feat-label { font-size: 24rpx; color: #888; margin-bottom: 10rpx; }
.chips-scroll { white-space: nowrap; width: 100%; }
.chips-flex { display: flex; gap: 12rpx; padding-bottom: 4rpx; align-items: center; }
.chip { display: inline-block; padding: 10rpx 24rpx; background-color: #fff; border: 1px solid #ddd; border-radius: 8rpx; font-size: 24rpx; color: #555; transition: all 0.2s; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.02); }
.chip.active { background-color: #e3f2fd; color: #007aff; border-color: #007aff; font-weight: bold; box-shadow: 0 2rpx 6rpx rgba(0,122,255,0.2); }
.chip-warn.active { background-color: #ffebee; color: #d32f2f; border-color: #d32f2f; }
.style-chip { padding: 12rpx 20rpx; }
.separator { color: #ddd; font-size: 20rpx; margin: 0 4rpx; }

.mini-btn-gen { background-color: #333; color: #fff; font-size: 24rpx; margin-top: 20rpx; border-radius: 40rpx; }

.input-item, .textarea-item { margin-bottom: 30rpx; }
.label { display: block; font-size: 28rpx; color: #666; margin-bottom: 16rpx; }
.label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.gen-btn { background-color: #007aff; color: #fff; font-size: 24rpx; padding: 6rpx 20rpx; border-radius: 30rpx; }
.input { background-color: #f8f8f8; height: 80rpx; padding: 0 20rpx; border-radius: 10rpx; font-size: 30rpx; }
.picker-box { background-color: #f8f8f8; height: 80rpx; padding: 0 20rpx; border-radius: 10rpx; font-size: 30rpx; line-height: 80rpx; color: #333; }
.quick-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.tag { background-color: #e3f2fd; color: #007aff; padding: 8rpx 20rpx; border-radius: 30rpx; font-size: 24rpx; border: 1px solid transparent; }
.tag:active { background-color: #bbdefb; transform: scale(0.95); }
.job-tag { background-color: #f3e5f5; color: #9c27b0; }
.textarea { background-color: #f8f8f8; width: 100%; padding: 20rpx; border-radius: 10rpx; font-size: 30rpx; height: 160rpx; box-sizing: border-box; }
.textarea.large { height: 240rpx; }
.memory-box { border: 2rpx dashed #9b59b6; background-color: #fdfaff; color: #555; line-height: 1.6; }
.tip { font-size: 24rpx; color: #999; margin-top: 10rpx; display: block; line-height: 1.5; }
.setting-tip { font-size: 24rpx; color: #999; margin-bottom: 20rpx; background: #f0f9eb; padding: 10rpx; border-radius: 8rpx; color: #2ecc71; }
.avatar-preview-box { margin-top: 20rpx; display: flex; justify-content: center; }
.avatar-preview { width: 160rpx; height: 160rpx; border-radius: 20rpx; border: 2px solid #eee; background: #fff; }
.avatar-placeholder { width: 160rpx; height: 160rpx; border-radius: 20rpx; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 2px dashed #ccc; }
.avatar-emoji { font-size: 60rpx; }
.bottom-area { padding: 20rpx 30rpx; background-color: #fff; border-top: 1px solid #eee; padding-bottom: calc(20rpx + constant(safe-area-inset-bottom)); padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); }
.save-btn { background-color: #007aff; color: #fff; border-radius: 40rpx; font-size: 32rpx; }
.clear-btn { background-color: #fff0f1; color: #ff4757; font-size: 30rpx; border: 1px solid #ffcccc; width: 100%; }
.slider-header { display: flex; justify-content: space-between; align-items: center; }
.help-text { font-size: 22rpx; color: #888; margin-bottom: 12rpx; }

/* 迷你风格卡片 */
.style-mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-bottom: 20rpx; }
.style-mini-card { background: #fff; border: 1px solid #eee; border-radius: 8rpx; padding: 12rpx 0; text-align: center; font-size: 22rpx; color: #666; }
.style-mini-card.active { border-color: #e67e22; background-color: #fff3e0; color: #d35400; font-weight: bold; }

/* 时间范围输入框优化 */
.time-range-box {
    display: flex;
    align-items: center;
    gap: 20rpx;
}
.time-input-wrapper {
    display: flex;
    align-items: center;
    background: #f8f8f8;
    padding: 12rpx 24rpx;
    border-radius: 12rpx;
    border: 1px solid #eee;
}
.mini-input {
    width: 60rpx;
    text-align: center;
    font-weight: bold;
    font-size: 30rpx;
    color: #333;
}
.suffix {
    color: #999;
    font-size: 24rpx;
    margin-left: 4rpx;
}
.separator {
    color: #ccc;
    font-size: 24rpx;
}

/* 星期选择器优化 */
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
    background: #f0f2f5;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    transition: all 0.2s;
    border: 2px solid transparent;
}
.day-chip.active {
    background: #e3f2fd;
    color: #007aff;
    border-color: #007aff;
    font-weight: bold;
    box-shadow: 0 2rpx 6rpx rgba(0,122,255,0.2);
}
.tip-text {
    font-size: 22rpx;
    color: #999;
    margin-top: 12rpx;
    display: block;
}

/* 🌟 新增：支持自定义输入的样式 */
.input-row {
    margin-bottom: 12rpx;
}
.mini-input-text {
    width: 100%;
    height: 60rpx;
    background: #f8f8f8;
    border-radius: 8rpx;
    padding: 0 20rpx;
    font-size: 26rpx;
    border: 1px solid transparent;
    box-sizing: border-box;
}
.mini-input-text:focus {
    background: #fff;
    border-color: #007aff;
}
</style>