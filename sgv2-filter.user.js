// ==UserScript==
// @name        SteamGifts v2 Giveaway Filter
// @namespace   https://github.com/GarionCZ/sgv2-filter
// @description Giveaway filter for SteamGifts v2
// @author      Garion
// @include     http://www.steamgifts.com/*
// @downloadURL https://github.com/GarionCZ/sgv2-filter/raw/master/sgv2-filter.user.js
// @updateURL   https://github.com/GarionCZ/sgv2-filter/raw/master/sgv2-filter.meta.js
// @version     0.2-DEV
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

// Keys for persistent settings, the keys for different views also represent "page keys" used as certain parameters to make things more simple
var KEY_EXCLUDE_GROUP_GIVEAWAYS = "excludeGroupGiveaways";
var KEY_EXCLUDE_WHITELIST_GIVEAWAYS = "excludeWhitelistGiveaways";
var KEY_EXCLUDE_PINNED_GIVEAWAYS = "excludePinnedGiveaways";
var KEY_ENABLE_FILTERING_BY_ENTRY_COUNT = "enableFilteringByEntryCount";
var KEY_MAX_NUMBER_OF_ENTRIES = "maxNumberOfEntries";
var KEY_MIN_LEVEL_TO_DISPLAY = "minLevelToDisplay";
var KEY_MAX_LEVEL_TO_DISPLAY = "maxLevelToDisplay";
var KEY_APPLY_TO_ALL_GIVEAWAYS_VIEW = "applyToAllGiveawaysView";
var KEY_APPLY_TO_GROUP_GIVEAWAYS_VIEW = "applyToGroupGiveawaysView";
var KEY_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW = "applyToWishlistGiveawaysView";
var KEY_APPLY_TO_NEW_GIVEAWAYS_VIEW = "applyToNewGiveawaysView";
var KEY_APPLY_TO_USER_PROFILE_VIEW = "applyToUserProfileView";
var KEY_APPLY_TO_SEARCH_RESULTS_VIEW = "applyToSearchResultsView";

// Default values of persistent settings
var DEFAULT_EXCLUDE_GROUP_GIVEAWAYS = true;
var DEFAULT_EXCLUDE_WHITELIST_GIVEAWAYS = true;
var DEFAULT_EXCLUDE_PINNED_GIVEAWAYS = false;
var DEFAULT_ENABLE_FILTERING_BY_ENTRY_COUNT = true;
var DEFAULT_MAX_NUMBER_OF_ENTRIES = 200;
var DEFAULT_MIN_LEVEL_TO_DISPLAY = 0;
var DEFAULT_MAX_LEVEL_TO_DISPLAY = 10;
var DEFAULT_APPLY_TO_ALL_GIVEAWAYS_VIEW = true;
var DEFAULT_APPLY_TO_GROUP_GIVEAWAYS_VIEW = false;
var DEFAULT_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW = false;
var DEFAULT_APPLY_TO_NEW_GIVEAWAYS_VIEW = true;
var DEFAULT_APPLY_TO_USER_PROFILE_VIEW = false;
var DEFAULT_APPLY_TO_SEARCH_RESULTS_VIEW = false;

// IDs of filter UI elements
var FILTER_CONTROLS_ID = "filterControls";
var FILTER_CAPTION_ID = "filterCaption";
var FILTER_DETAILS_ID = "filterDetails";
var FILTER_HIDE_ID = "filterHide";

// Does all the filtering
function filterGiveaways() {
  if (!isFilteringEnabledOnCurrentPage()) {
    // Since it's not enabled, remove any possible filtering
    var giveaways = getGiveaways();
    for (i = 0; i < giveaways.length; i++) {
      removeFiltering(giveaways[i]);
    }
    handlePinnedBlock();
    return;
  }
  
  // Dirty hack to "fix" endless scrolling in SG++ when a lot of GAs on the same page got removed
  window.scrollBy(0, 1);
  window.scrollBy(0, -1);

  var minLevelToDisplay = GM_getValue(KEY_MIN_LEVEL_TO_DISPLAY, DEFAULT_MIN_LEVEL_TO_DISPLAY);
  var maxLevelToDisplay = GM_getValue(KEY_MAX_LEVEL_TO_DISPLAY, DEFAULT_MAX_LEVEL_TO_DISPLAY);
  var excludeWhitelistGiveaways = GM_getValue(KEY_EXCLUDE_WHITELIST_GIVEAWAYS, DEFAULT_EXCLUDE_WHITELIST_GIVEAWAYS);
  var excludeGroupGiveaways = GM_getValue(KEY_EXCLUDE_GROUP_GIVEAWAYS, DEFAULT_EXCLUDE_GROUP_GIVEAWAYS);
  var excludePinnedGiveaways = GM_getValue(KEY_EXCLUDE_PINNED_GIVEAWAYS, DEFAULT_EXCLUDE_PINNED_GIVEAWAYS);
  var enableFilteringByEntryCount = GM_getValue(KEY_ENABLE_FILTERING_BY_ENTRY_COUNT, DEFAULT_ENABLE_FILTERING_BY_ENTRY_COUNT);
  var maxNumberOfEntries = GM_getValue(KEY_MAX_NUMBER_OF_ENTRIES, DEFAULT_MAX_NUMBER_OF_ENTRIES);
 
  var giveawaysToRemove = [];
  var giveaways = getGiveaways();
  for (i = 0; i < giveaways.length; i++) {
    // Remove the filtering
    removeFiltering(giveaways[i]);
      
    // Handle whitelist giveaways
    if (excludeWhitelistGiveaways) {
      if (isGiveawayFromWhitelist(giveaways[i])) {
        continue;
      }
    }
   
    // Handle group giveaways
    if (excludeGroupGiveaways) {
      if (isGiveawayFromGroup(giveaways[i])) {
        continue;
      }
    }
    
    // Handle pinned giveaways
    if (excludePinnedGiveaways) {
      if (isGiveawayPinned(giveaways[i])) {
        continue;
      }
    }
   
    // Evaluate the contributor level
    var contributorLevel = getContributorLevel(giveaways[i]);
    if (contributorLevel < minLevelToDisplay || contributorLevel > maxLevelToDisplay) {
      giveawaysToRemove.push(giveaways[i]);
      continue;
    }
    
    // Handle entry-count filtering
    if (enableFilteringByEntryCount) {
      var numberOfEntries = getNumberOfEntries(giveaways[i]);
      if (numberOfEntries > maxNumberOfEntries) {
        giveawaysToRemove.push(giveaways[i]);
        continue;
      }
    }
  }
 
  // Remove the giveaways
  for (i = 0; i < giveawaysToRemove.length; i++) {
    giveawaysToRemove[i].style.display = "none";
  }
    
  // Handle the pinned giveaways block
  handlePinnedBlock();
  
  // Dirty hack to "fix" endless scrolling in SG++ when a lot of GAs on the same page got removed
  window.scrollBy(0, 1);
  window.scrollBy(0, -1);
 
}

// Parses the giveaway elements from the whole page
function getGiveaways() {
  var giveawaysSgpp = document.getElementsByClassName("SGPP__gridTile");
  var giveaways = document.getElementsByClassName("giveaway__row-outer-wrap");
  var allGiveaways = [];
  allGiveaways.push.apply(allGiveaways, giveawaysSgpp);
  allGiveaways.push.apply(allGiveaways, giveaways);
  return allGiveaways;
}

// Returns true if the giveaway is for a whitelist, false otherwise
function isGiveawayFromWhitelist(giveaway) {
  return giveaway.getElementsByClassName("giveaway__column--whitelist").length > 0;
}

// Returns true if the giveaway is for a group, false otherwise
function isGiveawayFromGroup(giveaway) {
  return giveaway.getElementsByClassName("giveaway__column--group").length > 0;
}

// Returns true if the giveaway is pinned, false otherwise
function isGiveawayPinned(giveaway) {
  var outerParent = giveaway.parentElement.parentElement;
  return outerParent.className === "pinned-giveaways__outer-wrap";
}

// Returns the contributor level of a giveaway, return 0 if no level is specified
function getContributorLevel(giveaway) {
  var contributorLevels = giveaway.getElementsByClassName("giveaway__column--contributor-level giveaway__column--contributor-level--positive");
  // Since there is only one level in a giveaways, just take the first item if available
  if (contributorLevels.length === 0) {
    return 0;
  }
  var contributorLevel = contributorLevels[0].innerHTML;
  
  var substringStart = 0;
  // Remove the "Level " at the start of the string, if present (SG++ grid view doesn't have it)
  if (contributorLevel.indexOf("Level ") === 0) {
    substringStart = 6;
  }
  
  // Parse the level, remove the "+" from the end
  var level = contributorLevel.substring(substringStart, contributorLevel.length-1);
  
  return level;
}

// Parses the number of entries for a giveaway
function getNumberOfEntries(giveaway) {
  // Parse from SGv2 layout
  var spanElements = giveaway.getElementsByTagName("span");
  for (j = 0; j < spanElements.length; j++) {
    if (spanElements[j].innerHTML.indexOf("entr") != -1) {
      return parseInt(spanElements[j].innerHTML.substring(0, spanElements[j].innerHTML.indexOf(" ")).replace(",",""));    
    }
  }

  // Parse from SG++ grid layout
  var divElements = giveaway.getElementsByTagName("div");
  for (j = 0; j < divElements.length; j++) {
    if (divElements[j].style.cssFloat == "left" && divElements[j].innerHTML.indexOf("ntr") != -1) {
      var strongElements = divElements[j].getElementsByTagName("strong");
      // Just pick first, there is only one anyway
      if (strongElements.length > 0) {
        return parseInt(strongElements[0].innerHTML.replace(",",""));
      }
    }
  }
}

// Removes filtering from a given giveaway
function removeFiltering(giveaway) {
  giveaway.style.display = "";
}

// Hides the pinned block completely if all the giveaways got filtered, shows it if it contains at least one giveaway
function handlePinnedBlock() {
  var pinnedBlock = document.getElementsByClassName("pinned-giveaways__outer-wrap")[0];
  var pinnedGiveaways = pinnedBlock.getElementsByClassName("giveaway__row-outer-wrap");
  var giveawayRemaining = false;
  
  for (i = 0; i < pinnedGiveaways.length; i++) {
    if (pinnedGiveaways[i].style.display !== "none") {
      giveawayRemaining = true;
      break;
    }
  }
  
  if (giveawayRemaining) {
    pinnedBlock.style.display = "";
  } else {
    pinnedBlock.style.display = "none";
  }
  
}

// Returns true if filtering is enabled on the current page, false otherwise
function isFilteringEnabledOnCurrentPage() {
  var applyToAllGiveawaysView = GM_getValue(KEY_APPLY_TO_ALL_GIVEAWAYS_VIEW, DEFAULT_APPLY_TO_ALL_GIVEAWAYS_VIEW);
  var applyToGroupGiveawaysView = GM_getValue(KEY_APPLY_TO_GROUP_GIVEAWAYS_VIEW, DEFAULT_APPLY_TO_GROUP_GIVEAWAYS_VIEW);
  var applyToWishlistGiveawaysView = GM_getValue(KEY_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW, DEFAULT_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW);
  var applyToNewGiveawaysView = GM_getValue(KEY_APPLY_TO_NEW_GIVEAWAYS_VIEW, DEFAULT_APPLY_TO_NEW_GIVEAWAYS_VIEW);
  var applyToUserProfileView = GM_getValue(KEY_APPLY_TO_USER_PROFILE_VIEW, DEFAULT_APPLY_TO_USER_PROFILE_VIEW);
  var applyToSearchResultsView = GM_getValue(KEY_APPLY_TO_SEARCH_RESULTS_VIEW, DEFAULT_APPLY_TO_SEARCH_RESULTS_VIEW);
  var currentPage = window.location.href;
  
  if (applyToAllGiveawaysView && isCurrentPage(KEY_APPLY_TO_ALL_GIVEAWAYS_VIEW)) {
    return true;
  }
 
  if (applyToGroupGiveawaysView && isCurrentPage(KEY_APPLY_TO_GROUP_GIVEAWAYS_VIEW)) {
    return true;
  }
 
  if (applyToWishlistGiveawaysView && isCurrentPage(KEY_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW)) {
    return true;
  }
 
  if (applyToUserProfileView && isCurrentPage(KEY_APPLY_TO_USER_PROFILE_VIEW)) {
    return true;
  }
 
  if (applyToNewGiveawaysView && isCurrentPage(KEY_APPLY_TO_NEW_GIVEAWAYS_VIEW)) {
    return true;
  }
 
  if (applyToSearchResultsView && isCurrentPage(KEY_APPLY_TO_SEARCH_RESULTS_VIEW)) {
    return true;
  }

  return false;
}

function isCurrentPage(pageKey) {
  var currentPage = window.location.href;
  if (pageKey === KEY_APPLY_TO_ALL_GIVEAWAYS_VIEW) {
      return (currentPage.indexOf("http://www.steamgifts.com/giveaways/search?page=") === 0 || currentPage === "http://www.steamgifts.com" || currentPage === "http://www.steamgifts.com/");
  }
  if (pageKey === KEY_APPLY_TO_GROUP_GIVEAWAYS_VIEW) {
      return (currentPage.indexOf("http://www.steamgifts.com/giveaways/search?type=group") === 0);
  }
  if (pageKey === KEY_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW) {
      return (currentPage.indexOf("http://www.steamgifts.com/giveaways/search?type=wishlist") === 0);
  }
    if (pageKey === KEY_APPLY_TO_USER_PROFILE_VIEW) {
      return (currentPage.indexOf("http://www.steamgifts.com/user/") === 0);
  }
    if (pageKey === KEY_APPLY_TO_NEW_GIVEAWAYS_VIEW) {
      return (currentPage.indexOf("http://www.steamgifts.com/giveaways/search?type=new") === 0);
  }
    if (pageKey === KEY_APPLY_TO_SEARCH_RESULTS_VIEW) {
      return (currentPage.indexOf("http://www.steamgifts.com/giveaways/search?q") === 0);
  }
  return false;
}

// Draws the filter UI into the SG page
(function drawUi() {
  // Create the filter details element and add content to it
  var detailsContentDiv = document.createElement("div");
  detailsContentDiv.style.paddingLeft = "10px";
  detailsContentDiv.style.paddingRight = "10px";
  detailsContentDiv.appendChild(createFilterUiFilterOptionsRow());
  detailsContentDiv.appendChild(createFilterUiExcludeOptionsRow());
  detailsContentDiv.appendChild(createFilterUiEnabledPagesRow());
  
  var detailsDiv = document.createElement("div");
  detailsDiv.id = FILTER_DETAILS_ID;
  detailsDiv.style.display = "none";
  detailsDiv.appendChild(detailsContentDiv);
  detailsDiv.appendChild(createFilterUiHideFilterDetailsRow());
  
  // Create the filter UI element
  var controlsDiv = document.createElement("div");
  controlsDiv.setAttribute("id", FILTER_CONTROLS_ID);
  controlsDiv.style.border = "1px solid #d2d6e0";
  controlsDiv.style.borderRadius = "4px";
  controlsDiv.style.backgroundColor = "#E8EAEF";
  controlsDiv.style.marginBottom = "5px";
  controlsDiv.style.marginTop = "5px";
  controlsDiv.style.textShadow = "1px 1px rgba(255,255,255,0.90)";
    
  controlsDiv.appendChild(createFilterUiCaptionRow());
  controlsDiv.appendChild(detailsDiv);
  
  // Add the filter UI to the correct place on the current page
  insertFilterUi(controlsDiv);
  updateFilterCaptionTextColor();
  
  // Append a CSS to the page itself so the caption changes its background color slightly when hovered over
  var captionHoverCss = '#'+FILTER_CAPTION_ID+':hover{background-color:rgba(255,255,255,0.60);}';
  captionHoverCss += '#'+FILTER_HIDE_ID+':hover{background-color:rgba(255,255,255,0.60);}';
  var style = document.createElement('style');
  if (style.styleSheet) {
    style.styleSheet.cssText = captionHoverCss;
  } else {
    style.appendChild(document.createTextNode(captionHoverCss));
  }
  document.getElementsByTagName('head')[0].appendChild(style);
  
})();

// Creates the top-level caption that is visible all the time on a giveaway page
function createFilterUiCaptionRow() {
  var filterOptionsCaption = document.createElement("div");
  filterOptionsCaption.id = FILTER_CAPTION_ID;
  filterOptionsCaption.style.display = "flex";
  filterOptionsCaption.style.fontWeight = "700";
  filterOptionsCaption.style.paddingTop = "5px";
  filterOptionsCaption.style.paddingBottom = "5px";
  filterOptionsCaption.style.paddingLeft = "10px";
  filterOptionsCaption.style.paddingRight = "10px";
  filterOptionsCaption.style.cursor = "pointer";
  filterOptionsCaption.style.font = '700 14px/22px "Open Sans",sans-serif';
  filterOptionsCaption.appendChild(document.createTextNode(getFilterCaption()));
  filterOptionsCaption.onclick = function() {
    // Clicking on the caption opens/closes the filter details UI
    var detailsDiv = document.getElementById(FILTER_DETAILS_ID);
    if (detailsDiv.style.display === "") {
      detailsDiv.style.display = "none";
    } else {
      detailsDiv.style.display = "";
    }
  };
  return filterOptionsCaption;
}

// Creates the row with filtering options (level, number of entries, ...)
function createFilterUiFilterOptionsRow() {
  var minLevelToDisplay = GM_getValue(KEY_MIN_LEVEL_TO_DISPLAY, DEFAULT_MIN_LEVEL_TO_DISPLAY);
  var maxLevelToDisplay = GM_getValue(KEY_MAX_LEVEL_TO_DISPLAY, DEFAULT_MAX_LEVEL_TO_DISPLAY);
  var enableFilteringByEntryCount = GM_getValue(KEY_ENABLE_FILTERING_BY_ENTRY_COUNT, DEFAULT_ENABLE_FILTERING_BY_ENTRY_COUNT);
  var maxNumberOfEntries = GM_getValue(KEY_MAX_NUMBER_OF_ENTRIES, DEFAULT_MAX_NUMBER_OF_ENTRIES);  
  
  // The "minimal level to display" number input
  var minLevelToDisplayInput = document.createElement("input");
  minLevelToDisplayInput.setAttribute("type", "number");
  minLevelToDisplayInput.setAttribute("maxLength", "2");
  minLevelToDisplayInput.style.width = "55px";
  minLevelToDisplayInput.value = minLevelToDisplay;
  minLevelToDisplayInput.onchange = function() {
    // Filter out invalid values
    var minLevelToDisplayInputValue = parseInt(minLevelToDisplayInput.value);
    if (minLevelToDisplayInputValue < 0 || minLevelToDisplayInputValue > 10 || minLevelToDisplayInputValue > maxLevelToDisplay) {
      minLevelToDisplayInput.value = minLevelToDisplay;
    } else if (minLevelToDisplay != minLevelToDisplayInputValue) {
      // If the value changed, save it and update the UI
      GM_setValue(KEY_MIN_LEVEL_TO_DISPLAY, minLevelToDisplayInputValue);    
      minLevelToDisplay = minLevelToDisplayInputValue;
      updateFilterCaption();
      filterGiveaways();
    }
  };
  // Accept only digits
  minLevelToDisplayInput.onkeypress = function(event) {
    return isDigit(event.charCode);
  };
    
  // The "maximal level to display" number input
  var maxLevelToDisplayInput = document.createElement("input");
  maxLevelToDisplayInput.setAttribute("type", "number");
  maxLevelToDisplayInput.setAttribute("maxLength", "2");
  maxLevelToDisplayInput.style.width = "55px";
  maxLevelToDisplayInput.value = maxLevelToDisplay;
  maxLevelToDisplayInput.onchange = function() {
    // Filter out invalid values
    var maxLevelToDisplayInputValue = parseInt(maxLevelToDisplayInput.value);
    if (maxLevelToDisplayInputValue < 0 || maxLevelToDisplayInputValue > 10 || maxLevelToDisplayInputValue < minLevelToDisplay) {
      maxLevelToDisplayInput.value = maxLevelToDisplay;
    } else if (maxLevelToDisplay != maxLevelToDisplayInputValue) {
      // If the value changed, save it and update the UI
      GM_setValue(KEY_MAX_LEVEL_TO_DISPLAY, maxLevelToDisplayInputValue);
      maxLevelToDisplay = maxLevelToDisplayInputValue;
      updateFilterCaption();
      filterGiveaways();
    }
  };
  // Accept only digits
  maxLevelToDisplayInput.onkeypress = function(event) {
    return isDigit(event.charCode);
  };
  
  // Create and add the level filter
  var showLevelSpan = document.createElement("span");
  showLevelSpan.appendChild(document.createTextNode("Show level:"));
  showLevelSpan.style.paddingRight = "5px";
  
  var levelDashSpan = document.createElement("span");
  levelDashSpan.appendChild(document.createTextNode("-"));
  levelDashSpan.style.paddingRight = "5px";
  levelDashSpan.style.paddingLeft = "5px";
  
  var flexGrowLeftDiv = document.createElement("div");
  flexGrowLeftDiv.style.display = "flex";
  flexGrowLeftDiv.style.alignItems = "center";
  flexGrowLeftDiv.style.justifyContent = "flex-start";
  flexGrowLeftDiv.style.flexGrow = "1";
  flexGrowLeftDiv.style.flexBasis = "0";
  flexGrowLeftDiv.align = "left";
  flexGrowLeftDiv.appendChild(showLevelSpan);
  flexGrowLeftDiv.appendChild(minLevelToDisplayInput);
  flexGrowLeftDiv.appendChild(levelDashSpan);
  flexGrowLeftDiv.appendChild(maxLevelToDisplayInput);
    
  // The "enable filtering by entry count" input checkbox
  var enableFilteringByEntryCountInput = document.createElement("input");
  enableFilteringByEntryCountInput.setAttribute("type", "checkbox");
  enableFilteringByEntryCountInput.style.width = "13px";
  enableFilteringByEntryCountInput.style.marginLeft = "9px";
  enableFilteringByEntryCountInput.checked = enableFilteringByEntryCount;
  enableFilteringByEntryCountInput.onclick = function() {
    // Upon value change, enable and recolor the entry count input
    GM_setValue(KEY_ENABLE_FILTERING_BY_ENTRY_COUNT, enableFilteringByEntryCountInput.checked);
    maxNumberOfEntriesInput.disabled = !enableFilteringByEntryCountInput.checked;
    maxNumberOfEntriesInput.readOnly = !enableFilteringByEntryCountInput.checked;
    if (!enableFilteringByEntryCountInput.checked) {
      maxNumberOfEntriesInput.style.color = "#888";
      maxNumberOfEntriesInput.style.backgroundColor = "#E8EAEF";
    } else {
      maxNumberOfEntriesInput.style.color = maxNumberOfEntriesInputOriginalTextColor;
      maxNumberOfEntriesInput.style.backgroundColor = "#FFFFFF";
    }
    // Update the main UI
    updateFilterCaption();
    filterGiveaways();
  };
      
  // The "maximal number of entries" number input
  var maxNumberOfEntriesInput = document.createElement("input");
  maxNumberOfEntriesInput.setAttribute("type", "number");
  maxNumberOfEntriesInput.setAttribute("maxLength", "6");
  maxNumberOfEntriesInput.style.width = "90px";
  maxNumberOfEntriesInput.disabled = !enableFilteringByEntryCount;
  maxNumberOfEntriesInput.value = maxNumberOfEntries;
  maxNumberOfEntriesInput.readOnly = !enableFilteringByEntryCount;
  maxNumberOfEntriesInput.onchange = function() {
    // Limit the entry count filter to 1000000, should be enough for a while
    if (maxNumberOfEntriesInput.value < 0 || maxNumberOfEntriesInput.value > 1000000) {
      maxNumberOfEntriesInput.value = maxNumberOfEntries;
    } else if (maxNumberOfEntries != maxNumberOfEntriesInput.value) {
      // If the value changed, save it and update the UI
      GM_setValue(KEY_MAX_NUMBER_OF_ENTRIES, maxNumberOfEntriesInput.value);
      maxNumberOfEntries = maxNumberOfEntriesInput.value;
      updateFilterCaption();
      filterGiveaways();
      return;
    }
  };
  // Accept only digits
  maxNumberOfEntriesInput.onkeypress = function(event) {
    return isDigit(event.charCode);
  };
    
  var maxNumberOfEntriesInputOriginalTextColor = maxNumberOfEntriesInput.style.color;
  // Gray out the input text if disabled
  if (!enableFilteringByEntryCount) {
    maxNumberOfEntriesInput.style.color = "#888";
    maxNumberOfEntriesInput.style.backgroundColor = "#E8EAEF";
  }    
  
  // Create and add the entry count filter
  var entryFilteringEnabledSpan = document.createElement("span");
  entryFilteringEnabledSpan.appendChild(document.createTextNode("Entry count filtering"));
    
  var entryFilteringCountSpan = document.createElement("span");
  entryFilteringCountSpan.appendChild(document.createTextNode("Max # of entries:"));
  entryFilteringCountSpan.style.paddingRight = "5px";
  entryFilteringCountSpan.style.paddingLeft = "10px";
  
  var flexGrowRightDiv = document.createElement("div");
  flexGrowRightDiv.style.display = "flex";
  flexGrowRightDiv.style.alignItems = "center";
  flexGrowRightDiv.style.justifyContent = "flex-end";
  flexGrowRightDiv.style.flexGrow = "1";
  flexGrowRightDiv.style.flexBasis = "0";
  flexGrowRightDiv.align = "right";
  flexGrowRightDiv.appendChild(entryFilteringEnabledSpan);
  flexGrowRightDiv.appendChild(enableFilteringByEntryCountInput);
  flexGrowRightDiv.appendChild(entryFilteringCountSpan);
  flexGrowRightDiv.appendChild(maxNumberOfEntriesInput);
  
  // Create the row itself
  var row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.paddingTop = "5px";
  row.style.paddingBottom = "5px";
  row.style.borderTop = "1px solid #d2d6e0";
  row.appendChild(flexGrowLeftDiv);
  row.appendChild(flexGrowRightDiv);
  return row;
}

// Creates a row with the "exclude" options
function createFilterUiExcludeOptionsRow() {
  var excludeWhitelistGiveaways = GM_getValue(KEY_EXCLUDE_WHITELIST_GIVEAWAYS, DEFAULT_EXCLUDE_WHITELIST_GIVEAWAYS);
  var excludeGroupGiveaways = GM_getValue(KEY_EXCLUDE_GROUP_GIVEAWAYS, DEFAULT_EXCLUDE_GROUP_GIVEAWAYS);
  var excludePinnedGiveaways = GM_getValue(KEY_EXCLUDE_PINNED_GIVEAWAYS, DEFAULT_EXCLUDE_PINNED_GIVEAWAYS);
      
  // The "exlude group GAs" input checkbox
  var excludeGroupGiveawaysInput = document.createElement("input");
  excludeGroupGiveawaysInput.setAttribute("type", "checkbox");
  excludeGroupGiveawaysInput.style.width = "13px";
  excludeGroupGiveawaysInput.style.marginLeft = "9px";
  excludeGroupGiveawaysInput.checked = excludeGroupGiveaways;
  excludeGroupGiveawaysInput.onclick = function(){
    // Save the change and update the UI
    GM_setValue(KEY_EXCLUDE_GROUP_GIVEAWAYS, excludeGroupGiveawaysInput.checked);
    updateFilterCaption();
    filterGiveaways();
  };
    
  var excludeGroupGiveawaysSpan = document.createElement("span");
  excludeGroupGiveawaysSpan.appendChild(document.createTextNode("Exclude group giveaways"));
    
  // Create and add the group GAs exclusion element
  var flexGrowLeftDiv = document.createElement("div");
  flexGrowLeftDiv.style.display = "flex";
  flexGrowLeftDiv.style.alignItems = "center";
  flexGrowLeftDiv.style.justifyContent = "flex-start";
  flexGrowLeftDiv.style.flexGrow = "1";
  flexGrowLeftDiv.style.flexBasis = "0";
  flexGrowLeftDiv.align = "left";
  flexGrowLeftDiv.appendChild(excludeGroupGiveawaysSpan);
  flexGrowLeftDiv.appendChild(excludeGroupGiveawaysInput);
      
  // The "exlude whitelist GAs" input checkbox
  var excludeWhitelistGiveawaysInput = document.createElement("input");
  excludeWhitelistGiveawaysInput.setAttribute("type", "checkbox");
  excludeWhitelistGiveawaysInput.style.width = "13px";
  excludeWhitelistGiveawaysInput.style.marginLeft = "9px";
  excludeWhitelistGiveawaysInput.checked = excludeWhitelistGiveaways;
  excludeWhitelistGiveawaysInput.onclick = function() {
    // If the value changed, save it and update the UI
    GM_setValue(KEY_EXCLUDE_WHITELIST_GIVEAWAYS, excludeWhitelistGiveawaysInput.checked);
    updateFilterCaption();
    filterGiveaways();
  };  
  
  var excludeWhitelistGiveawaysSpan = document.createElement("span");
  excludeWhitelistGiveawaysSpan.appendChild(document.createTextNode("Exclude whitelist giveaways"));
    
  // Create and add the whitelist GAs exclusion element
  var flexGrowCenterDiv = document.createElement("div");
  flexGrowCenterDiv.style.display = "flex";
  flexGrowCenterDiv.style.alignItems = "center";
  flexGrowCenterDiv.style.justifyContent = "center";
  flexGrowCenterDiv.style.flexGrow = "1";
  flexGrowCenterDiv.style.flexBasis = "0";
  flexGrowCenterDiv.align = "center";
  flexGrowCenterDiv.appendChild(excludeWhitelistGiveawaysSpan);
  flexGrowCenterDiv.appendChild(excludeWhitelistGiveawaysInput);
    
  // The "exclude pinned giveaways" input checkbox
  var excludePinnedGiveawaysInput = document.createElement("input");
  excludePinnedGiveawaysInput.setAttribute("type", "checkbox");
  excludePinnedGiveawaysInput.style.width = "13px";
  excludePinnedGiveawaysInput.style.marginLeft = "9px";
  excludePinnedGiveawaysInput.checked = excludePinnedGiveaways;
  excludePinnedGiveawaysInput.onclick = function() {
    // Upon value change
    GM_setValue(KEY_EXCLUDE_PINNED_GIVEAWAYS, excludePinnedGiveawaysInput.checked);
    excludePinnedGiveaways = excludePinnedGiveawaysInput.checked;
    // Update the main UI
    updateFilterCaption();
    filterGiveaways();
  };  
  
  var excludePinnedGiveawaysSpan = document.createElement("span");
  excludePinnedGiveawaysSpan.appendChild(document.createTextNode('Exclude pinned giveaways'));
  
  // Create and add the "exclude pinned giveaways" text
  var flexGrowRightDiv = document.createElement("div");
  flexGrowRightDiv.style.display = "flex";
  flexGrowRightDiv.style.alignItems = "center";
  flexGrowRightDiv.style.justifyContent = "flex-end";
  flexGrowRightDiv.style.flexGrow = "1";
  flexGrowRightDiv.style.flexBasis = "0";
  flexGrowRightDiv.align = "right";
  flexGrowRightDiv.appendChild(excludePinnedGiveawaysSpan);
  flexGrowRightDiv.appendChild(excludePinnedGiveawaysInput);
  
  // Create the row itself
  var row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.paddingTop = "5px";
  row.style.paddingBottom = "5px";
  row.style.borderTop = "1px solid #d2d6e0";
  row.appendChild(flexGrowLeftDiv);
  row.appendChild(flexGrowCenterDiv);
  row.appendChild(flexGrowRightDiv);
  return row;
}

// Creates the row with "enabled pages" settings
function createFilterUiEnabledPagesRow() {
  var applyToAllGiveawaysView = GM_getValue(KEY_APPLY_TO_ALL_GIVEAWAYS_VIEW, DEFAULT_APPLY_TO_ALL_GIVEAWAYS_VIEW);
  var applyToGroupGiveawaysView = GM_getValue(KEY_APPLY_TO_GROUP_GIVEAWAYS_VIEW, DEFAULT_APPLY_TO_GROUP_GIVEAWAYS_VIEW);
  var applyToWishlistGiveawaysView = GM_getValue(KEY_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW, DEFAULT_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW);
  var applyToNewGiveawaysView = GM_getValue(KEY_APPLY_TO_NEW_GIVEAWAYS_VIEW, DEFAULT_APPLY_TO_NEW_GIVEAWAYS_VIEW);
  var applyToUserProfileView = GM_getValue(KEY_APPLY_TO_USER_PROFILE_VIEW, DEFAULT_APPLY_TO_USER_PROFILE_VIEW);
  var applyToSearchResultsView = GM_getValue(KEY_APPLY_TO_SEARCH_RESULTS_VIEW, DEFAULT_APPLY_TO_SEARCH_RESULTS_VIEW); 
    
  // Create and add the "enable filtering on the main page" text
  var flexGrowLeftDiv = document.createElement("div");
  flexGrowLeftDiv.style.display = "flex";
  flexGrowLeftDiv.style.alignItems = "center";
  flexGrowLeftDiv.style.justifyContent = "flex-start";
  flexGrowLeftDiv.style.flexGrow = "1";
  flexGrowLeftDiv.style.flexBasis = "0";
  flexGrowLeftDiv.align = "left";
  var enableFilteringOnTheMainPageSpan = document.createElement("span");
  enableFilteringOnTheMainPageSpan.appendChild(document.createTextNode("Enable on the main page"));
  if (isCurrentPage(KEY_APPLY_TO_ALL_GIVEAWAYS_VIEW)) {
    enableFilteringOnTheMainPageSpan.appendChild(document.createTextNode(" (this page)"));
  }
  flexGrowLeftDiv.appendChild(enableFilteringOnTheMainPageSpan);
    
  // The "enable filtering on the main page" input checkbox
  var enableFilteringOnTheMainPageInput = document.createElement("input");
  enableFilteringOnTheMainPageInput.setAttribute("type", "checkbox");
  enableFilteringOnTheMainPageInput.style.width = "13px";
  enableFilteringOnTheMainPageInput.style.marginLeft = "9px";
  enableFilteringOnTheMainPageInput.checked = applyToAllGiveawaysView;
  enableFilteringOnTheMainPageInput.onclick = function() {
    // Upon value change
    GM_setValue(KEY_APPLY_TO_ALL_GIVEAWAYS_VIEW, enableFilteringOnTheMainPageInput.checked);
    applyToAllGiveawaysView = enableFilteringOnTheMainPageInput.checked;
    // Update the main UI
    updateFilterCaption();
    filterGiveaways();
  };
  flexGrowLeftDiv.appendChild(enableFilteringOnTheMainPageInput);

  // Create and add the "enable filtering on the new giveaways page" text
  var flexGrowCenterDiv = document.createElement("div");
  flexGrowCenterDiv.style.display = "flex";
  flexGrowCenterDiv.style.alignItems = "center";
  flexGrowCenterDiv.style.justifyContent = "center";
  flexGrowCenterDiv.style.flexGrow = "1";
  flexGrowCenterDiv.style.flexBasis = "0";
  flexGrowCenterDiv.align = "center";
  var enableFilteringOnTheNewGiveawaysPageSpan = document.createElement("span");
  enableFilteringOnTheNewGiveawaysPageSpan.appendChild(document.createTextNode('Enable on the "new giveaways" page'));
  if (isCurrentPage(KEY_APPLY_TO_NEW_GIVEAWAYS_VIEW)) {
    enableFilteringOnTheNewGiveawaysPageSpan.appendChild(document.createTextNode(" (this page)"));
  }
  flexGrowCenterDiv.appendChild(enableFilteringOnTheNewGiveawaysPageSpan);
    
  // The "enable filtering on the new giveaways page" input checkbox
  var enableFilteringOnTheNewGiveawaysPageInput = document.createElement("input");
  enableFilteringOnTheNewGiveawaysPageInput.setAttribute("type", "checkbox");
  enableFilteringOnTheNewGiveawaysPageInput.style.width = "13px";
  enableFilteringOnTheNewGiveawaysPageInput.style.marginLeft = "9px";
  enableFilteringOnTheNewGiveawaysPageInput.checked = applyToNewGiveawaysView;
  enableFilteringOnTheNewGiveawaysPageInput.onclick = function() {
    // Upon value change
    GM_setValue(KEY_APPLY_TO_NEW_GIVEAWAYS_VIEW, enableFilteringOnTheNewGiveawaysPageInput.checked);
    applyToNewGiveawaysView = enableFilteringOnTheNewGiveawaysPageInput.checked;
    // Update the main UI
    updateFilterCaption();
    filterGiveaways();
  };
  flexGrowCenterDiv.appendChild(enableFilteringOnTheNewGiveawaysPageInput);

  // Create and add the "enable filtering on the search results" text
  var flexGrowRightDiv = document.createElement("div");
  flexGrowRightDiv.style.display = "flex";
  flexGrowRightDiv.style.alignItems = "center";
  flexGrowRightDiv.style.justifyContent = "flex-end";
  flexGrowRightDiv.style.flexGrow = "1";
  flexGrowRightDiv.style.flexBasis = "0";
  flexGrowRightDiv.align = "right";
  var enableFilteringOnTheSearchResultsPageSpan = document.createElement("span");
  enableFilteringOnTheSearchResultsPageSpan.appendChild(document.createTextNode('Enable on the "search results" page'));
  if (isCurrentPage(KEY_APPLY_TO_SEARCH_RESULTS_VIEW)) {
    enableFilteringOnTheSearchResultsPageSpan.appendChild(document.createTextNode(" (this page)"));
  }
  flexGrowRightDiv.appendChild(enableFilteringOnTheSearchResultsPageSpan);
    
  // The "enable filtering on the search results" input checkbox
  var enableFilteringOnTheSearchResultsPageInput = document.createElement("input");
  enableFilteringOnTheSearchResultsPageInput.setAttribute("type", "checkbox");
  enableFilteringOnTheSearchResultsPageInput.style.width = "13px";
  enableFilteringOnTheSearchResultsPageInput.style.marginLeft = "9px";
  enableFilteringOnTheSearchResultsPageInput.checked = applyToSearchResultsView;
  enableFilteringOnTheSearchResultsPageInput.onclick = function() {
    // Upon value change
    GM_setValue(KEY_APPLY_TO_SEARCH_RESULTS_VIEW, enableFilteringOnTheSearchResultsPageInput.checked);
    applyToSearchResultsView = enableFilteringOnTheSearchResultsPageInput.checked;
    // Update the main UI
    updateFilterCaption();
    filterGiveaways();
  };
  flexGrowRightDiv.appendChild(enableFilteringOnTheSearchResultsPageInput);
    
  // Create the first row in the filter details
  var firstRow = document.createElement("div");
  firstRow.style.display = "flex";
  firstRow.style.alignItems = "center";
  firstRow.style.paddingTop = "5px";
  firstRow.style.paddingBottom = "5px";
  firstRow.style.borderTop = "1px solid #d2d6e0";
  firstRow.appendChild(flexGrowLeftDiv);
  firstRow.appendChild(flexGrowCenterDiv);  
  firstRow.appendChild(flexGrowRightDiv);  
    
  // Create and add the "enable filtering on the wishlist giveaways page" text
  flexGrowLeftDiv = document.createElement("div");
  flexGrowLeftDiv.style.display = "flex";
  flexGrowLeftDiv.style.alignItems = "center";
  flexGrowLeftDiv.style.justifyContent = "flex-start";
  flexGrowLeftDiv.style.flexGrow = "1";
  flexGrowLeftDiv.style.flexBasis = "0";
  flexGrowLeftDiv.align = "left";
  var enableFilteringOnTheWishlistGiveawaysPageSpan = document.createElement("span");
  enableFilteringOnTheWishlistGiveawaysPageSpan.appendChild(document.createTextNode('Enable on the "wishlist giveaways" page'));
  if (isCurrentPage(KEY_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW)) {
    enableFilteringOnTheWishlistGiveawaysPageSpan.appendChild(document.createTextNode(" (this page)"));
  }
  flexGrowLeftDiv.appendChild(enableFilteringOnTheWishlistGiveawaysPageSpan);
    
  // The "enable filtering on the wishlist giveaways page" input checkbox
  var enableFilteringOnTheWishlistGiveawaysPageInput = document.createElement("input");
  enableFilteringOnTheWishlistGiveawaysPageInput.setAttribute("type", "checkbox");
  enableFilteringOnTheWishlistGiveawaysPageInput.style.width = "13px";
  enableFilteringOnTheWishlistGiveawaysPageInput.style.marginLeft = "9px";
  enableFilteringOnTheWishlistGiveawaysPageInput.checked = applyToWishlistGiveawaysView;
  enableFilteringOnTheWishlistGiveawaysPageInput.onclick = function() {
    // Upon value change
    GM_setValue(KEY_APPLY_TO_WISHLIST_GIVEAWAYS_VIEW, enableFilteringOnTheWishlistGiveawaysPageInput.checked);
    applyToWishlistGiveawaysView = enableFilteringOnTheWishlistGiveawaysPageInput.checked;
    // Update the main UI
    updateFilterCaption();
    filterGiveaways();
  };
  flexGrowLeftDiv.appendChild(enableFilteringOnTheWishlistGiveawaysPageInput);
    
  // Create and add the "enable filtering on the "group giveaways" page" text
  flexGrowCenterDiv = document.createElement("div");
  flexGrowCenterDiv.style.display = "flex";
  flexGrowCenterDiv.style.alignItems = "center";
  flexGrowCenterDiv.style.justifyContent = "center";
  flexGrowCenterDiv.style.flexGrow = "1";
  flexGrowCenterDiv.style.flexBasis = "0";
  flexGrowCenterDiv.align = "center";
  var enableFilteringOnTheGroupGiveawaysPageSpan = document.createElement("span");
  enableFilteringOnTheGroupGiveawaysPageSpan.appendChild(document.createTextNode('Enable on the "group giveaways" page'));
  if (isCurrentPage(KEY_APPLY_TO_GROUP_GIVEAWAYS_VIEW)) {
    enableFilteringOnTheGroupGiveawaysPageSpan.appendChild(document.createTextNode(" (this page)"));
  }
  flexGrowCenterDiv.appendChild(enableFilteringOnTheGroupGiveawaysPageSpan);
    
  // The "enable filtering on the "group giveaways" page" page" input checkbox
  var enableFilteringOnTheGroupGiveawaysPageInput = document.createElement("input");
  enableFilteringOnTheGroupGiveawaysPageInput.setAttribute("type", "checkbox");
  enableFilteringOnTheGroupGiveawaysPageInput.style.width = "13px";
  enableFilteringOnTheGroupGiveawaysPageInput.style.marginLeft = "9px";
  enableFilteringOnTheGroupGiveawaysPageInput.checked = applyToGroupGiveawaysView;
  enableFilteringOnTheGroupGiveawaysPageInput.onclick = function() {
    // Upon value change
    GM_setValue(KEY_APPLY_TO_GROUP_GIVEAWAYS_VIEW, enableFilteringOnTheGroupGiveawaysPageInput.checked);
    applyToGroupGiveawaysView = enableFilteringOnTheGroupGiveawaysPageInput.checked;
    // Update the main UI
    updateFilterCaption();
    filterGiveaways();
  };
  flexGrowCenterDiv.appendChild(enableFilteringOnTheGroupGiveawaysPageInput);
    
  // Create and add the "enable filtering on the user profile page" text
  flexGrowRightDiv = document.createElement("div");
  flexGrowRightDiv.style.display = "flex";
  flexGrowRightDiv.style.alignItems = "center";
  flexGrowRightDiv.style.justifyContent = "flex-end";
  flexGrowRightDiv.style.flexGrow = "1";
  flexGrowRightDiv.style.flexBasis = "0";
  flexGrowRightDiv.align = "right";
  var enableFilteringOnTheUserProfilePageSpan = document.createElement("span");
  enableFilteringOnTheUserProfilePageSpan.appendChild(document.createTextNode('Enable on the "user profile" page'));
  if (isCurrentPage(KEY_APPLY_TO_USER_PROFILE_VIEW)) {
    enableFilteringOnTheUserProfilePageSpan.appendChild(document.createTextNode(" (this page)"));
  }
  flexGrowRightDiv.appendChild(enableFilteringOnTheUserProfilePageSpan);
    
  // The "enable filtering on the user profile page" input checkbox
  var enableFilteringOnTheUserProfilePageInput = document.createElement("input");
  enableFilteringOnTheUserProfilePageInput.setAttribute("type", "checkbox");
  enableFilteringOnTheUserProfilePageInput.style.width = "13px";
  enableFilteringOnTheUserProfilePageInput.style.marginLeft = "9px";
  enableFilteringOnTheUserProfilePageInput.checked = applyToUserProfileView;
  enableFilteringOnTheUserProfilePageInput.onclick = function() {
    // Upon value change
    GM_setValue(KEY_APPLY_TO_USER_PROFILE_VIEW, enableFilteringOnTheUserProfilePageInput.checked);
    applyToUserProfileView = enableFilteringOnTheUserProfilePageInput.checked;
    // Update the main UI
    updateFilterCaption();
    filterGiveaways();
  };
  flexGrowRightDiv.appendChild(enableFilteringOnTheUserProfilePageInput);
  
  // Create the second row in the filter details
  var secondRow = document.createElement("div");
  secondRow.style.display = "flex";
  secondRow.style.alignItems = "center";
  secondRow.style.paddingTop = "5px";
  secondRow.style.paddingBottom = "5px";
  secondRow.appendChild(flexGrowLeftDiv);
  secondRow.appendChild(flexGrowCenterDiv);
  secondRow.appendChild(flexGrowRightDiv);
    
  // Create the row itself
  var row = document.createElement("div");
  row.appendChild(firstRow);
  row.appendChild(secondRow);
  return row;
}

// Creates a row that hides the filter details
function createFilterUiHideFilterDetailsRow() {
  var hideControlsDiv = document.createElement("div");
  hideControlsDiv.id = FILTER_HIDE_ID;
  hideControlsDiv.style.textAlign = "center";
  hideControlsDiv.style.paddingTop = "5px";
  hideControlsDiv.style.paddingBottom = "5px";
  hideControlsDiv.style.borderTop = "1px solid #d2d6e0";
  hideControlsDiv.style.cursor = "pointer";
  hideControlsDiv.appendChild(document.createTextNode("Hide filter options"));
  hideControlsDiv.onclick = function(){
    // Hide the filter details
    var filterDetails = document.getElementById(FILTER_DETAILS_ID);
    if (filterDetails !== null) {
      filterDetails.style.display = "none";
    }
  };
  return hideControlsDiv;
}

function insertFilterUi(filterUi) {
  // Insert into main giveaway UI
  var elements = document.getElementsByClassName("pinned-giveaways__outer-wrap");
  if (elements.length > 0) {
    var parent = elements[0].parentElement;
    parent.insertBefore(filterUi, parent.childNodes[2]);
    return;
  }
    
  // Insert into profile
  elements = document.getElementsByClassName("page__heading");
  // Since "page__heading" is on multiple pages, a check needs to be done that user is on the profile page
  if (isCurrentPage(KEY_APPLY_TO_USER_PROFILE_VIEW) && elements.length > 0) {
    var parent = elements[0].parentElement;
    parent.insertBefore(filterUi, parent.childNodes[2]);
    return;
  }
}

// Updates filter caption in the UI
function updateFilterCaption() {
  var filterCaptionDiv = document.getElementById(FILTER_CAPTION_ID);
  filterCaptionDiv.innerHTML = getFilterCaption();
  updateFilterCaptionTextColor();
}

// Updates filter caption text color based on the current filtering status
function updateFilterCaptionTextColor() {
  var filterCaptionDiv = document.getElementById(FILTER_CAPTION_ID);
  if (isFilteringEnabledOnCurrentPage()) {
    filterCaptionDiv.style.color = "#4B72D4";
  } else {
    filterCaptionDiv.style.color = "#888888";
  }
}

// Creates the text for the filter caption
function getFilterCaption() {
  var filterCaption = "Giveaway Filter";
  
  if (!isFilteringEnabledOnCurrentPage()) {
    return filterCaption;
  }
  
  // Add the level range to the caption
  var minLevelToDisplay = GM_getValue(KEY_MIN_LEVEL_TO_DISPLAY, DEFAULT_MIN_LEVEL_TO_DISPLAY);
  var maxLevelToDisplay = GM_getValue(KEY_MAX_LEVEL_TO_DISPLAY, DEFAULT_MAX_LEVEL_TO_DISPLAY);
  filterCaption += " (Level " + minLevelToDisplay + "-" + maxLevelToDisplay;
    
  // Add the maximal amount of entries to the caption
  var enableFilteringByEntryCount = GM_getValue(KEY_ENABLE_FILTERING_BY_ENTRY_COUNT, DEFAULT_ENABLE_FILTERING_BY_ENTRY_COUNT);
  if (enableFilteringByEntryCount) {
    var maxNumberOfEntries = GM_getValue(KEY_MAX_NUMBER_OF_ENTRIES, 200);
    filterCaption += ", Max " + maxNumberOfEntries + " entries";
  }
  
  // Add the excluded information to the caption
  var excludeWhitelistGiveaways = GM_getValue(KEY_EXCLUDE_WHITELIST_GIVEAWAYS, DEFAULT_EXCLUDE_WHITELIST_GIVEAWAYS);
  var excludeGroupGiveaways = GM_getValue(KEY_EXCLUDE_GROUP_GIVEAWAYS, DEFAULT_EXCLUDE_GROUP_GIVEAWAYS);
  var excludePinnedGiveaways = GM_getValue(KEY_EXCLUDE_PINNED_GIVEAWAYS, DEFAULT_EXCLUDE_PINNED_GIVEAWAYS);
  var excluded = "";
  if (excludeGroupGiveaways) {
    excluded += "Group";
  }
  if (excludeWhitelistGiveaways) {
    if (excluded !== "") {
      excluded += "/";
    }
    excluded += "Whitelist";
  }
  if (excludePinnedGiveaways) {
    if (excluded !== "") {
      excluded += "/";
    }
    excluded += "Pinned";
  }
  if (excluded !== "") {
    excluded = ", " + excluded + " GAs excluded";
  }
  filterCaption += excluded;
    
  // Close it up and return
  filterCaption += ")";
  return filterCaption;
}

// Returns true if the character (its code) is a digit, false otherwise
function isDigit(charCode) {
  return charCode >= 48 && charCode <= 57;
}

// Function handling execution after DOM has been changed - makes the filtering work in endless scrolling of SG++
var observeDOM = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
        eventListenerSupported = window.addEventListener;
 
    return function(obj, callback){
        if( MutationObserver ){
            // Define a new observer
            var obs = new MutationObserver(function(mutations, observer){
                if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                    callback();
            });
            // Have the observer observe the registered element for changes in its children
            obs.observe( obj, { childList:true, subtree:true });
        }
        else if( eventListenerSupported ){
            obj.addEventListener('DOMNodeInserted', callback, false);
            obj.addEventListener('DOMNodeRemoved', callback, false);
        }
    };
})();

// Register the filtering upon any changes on the whole page
observeDOM(document, function(){
    filterGiveaways();
});