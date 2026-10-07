---
name: ENSO 營運工作台
description: 延續品牌色彩，優先呈現可掃讀的資料與可操作的流程
colors:
  navy: "#09256f"
  cream: "#efe6e1"
  surface: "#fffaf6"
  lime: "#d9f81b"
  orange: "#ff5a1f"
  muted: "#53607a"
  line: "rgba(9, 37, 111, 0.16)"
  success: "#14624f"
  warning: "#805500"
  danger: "#ba3e2a"
typography:
  headline:
    fontFamily: "Noto Sans TC, sans-serif"
    fontSize: "clamp(1.6rem, 3vw, 2.65rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Noto Sans TC, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.9rem"
    lineHeight: 1.6
rounded:
  field: "8px"
  panel: "12px"
  dialog: "16px"
  pill: "999px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
---

# Design System: ENSO 營運工作台

## Overview

沿用使用者已確認的「營運工作台」定位，以奶油米色、深藍、螢光黃綠及橘紅延續 ENSO 品牌。工作區以清楚的標題、資料表格與表單為主，不把前台的大型裝飾字體搬進操作介面。

本文件記錄目前實作，不是尚未完成的獨立視覺稿核准紀錄。產品事實及限制見 PRODUCT.md。

## Colors

深藍承擔文字、主要提交操作與導覽識別。奶油米色是頁面背景，暖白區分資料容器。螢光黃綠用於目前導覽位置與品牌強調，橘紅作為少量焦點提示。

成功、警告、危險使用獨立語意色，同時必須顯示中文狀態，不靠顏色單獨傳達訊息。

## Typography

內文與控制項使用 Noto Sans TC 及系統無襯線備援。頁面標題使用 headline 尺度，資料內容以約十四像素為主，輔助說明以約十三像素為主。數值表格使用等寬數字。不要對中文表格使用前台展示型的巨大字體與過寬字距。

## Layout

Header 背景橫跨視窗，內部內容最大寬度為一千四百四十像素。主要工作區最大寬度為一千五百五十二像素，左右留白在十六至五十六像素間調整。

八百六十像素以下使用折疊導覽。七百六十七像素以下商品列表改為卡片，商品編輯表單改成單欄。訂單、庫存與優惠券維持容器內橫向捲動，附操作欄提示，不讓整頁橫向溢位。

## Elevation & Depth

一般容器用細邊框與底色區分，不靠陰影堆疊。原生 dialog 使用半透明深藍遮罩及柔和下落陰影，表頭和操作區固定於可捲動內容之外。

## Shapes

欄位使用 field 圓角，主要容器使用 panel 圓角，彈窗使用 dialog 圓角。導覽、按鈕與狀態標籤採小型膠囊形。部分圖表與設備資料區維持平直邊界，以資料密度為優先。

## Components

### Buttons

主要按鈕是深藍底白字，hover 變為較亮的深藍。次要按鈕使用透明底與細描邊。危險操作有獨立紅色與明確確認文案。提交時停用重複操作。

### Inputs

顯示欄位標籤、範例或限制。價格與庫存使用數字輸入，圖片上傳限制以文字說明。儲存失敗保留視窗和輸入內容，顯示可採取行動的錯誤訊息。

### Navigation

目前頁以螢光黃綠標記。手機以展開按鈕切換導覽，保留七個管理入口。隱藏功能不重新加入選單。

### Dialogs

使用原生 dialog 保護鍵盤焦點。取消或關閉後恢復焦點，操作忙碌時避免誤關閉。內容區可捲動，不延伸出小螢幕。

### Images

商品縮圖與編輯預覽使用 contain 保留包裝主體。主圖採直式固定比例容器，圖庫最多五張。圖片失敗顯示有文字的品牌備援，不以空白代替。不得覆蓋或刪除前台原圖。

### States

載入中、空資料、錯誤、停用、低庫存、已付款與未付款需要可辨識文字。示範模式、設備模擬及未串接真實金流必須直接標示。

## Do's and Don'ts

- Do 保留原生鍵盤操作、可見焦點與 reduced-motion 支援。
- Do 讓使用者在資料旁看見相關操作與儲存結果。
- Do 區分示範資料與正式 API 資料。
- Don't 將圖片規劃稿當成已上架的商品素材。
- Don't 重新加入舊式 Kyoto、和紙或格紋裝飾。
- Don't 把尚未完成的視覺稿確認或正式 API 驗證寫成通過。

