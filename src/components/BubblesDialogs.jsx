import React from 'react';
import BubbleDialog from './BubbleDialog';
import TagEditorDialog from './TagEditorDialog';
import MainMenuDrawer from './MainMenuDrawer';
import AboutDialog from './AboutDialog';
import TaskFilterDrawer from './TaskFilterDrawer';
import TasksCategoriesDialog from './TasksCategoriesDialog';
import FontSettingsDialog from './FontSettingsDialog';
import AppearanceDialog from './AppearanceDialog';
import ChangePasswordDialog from './ChangePasswordDialog';
import LogoutConfirmDialog from './LogoutConfirmDialog';
import TaskListDrawer from './ListViewDrawer';
import { isOverdue } from '../utils/notifications';
import { saveTagsToFirestore } from '../services/firestoreService';

/**
 * Presentational container for all of BubblesPage's dialogs and drawers.
 *
 * Extracted from BubblesPage.jsx (Task A of #64): ~13 dialogs/drawers were pure
 * props wiring at the bottom of the page's JSX. This component holds no business
 * logic — every handler/state value is supplied by BubblesPage. The two
 * BubbleDialog helpers that carry logic (onStopPulsing / showStopPulsing)
 * stay in BubblesPage and arrive here as plain props.
 */
const BubblesDialogs = ({
    t,
    isMobile,
    isSmallScreen,
    themeMode,
    getDialogPaperStyles,
    tags,
    setTags,
    bubbles,
    setBubbles,
    // Edit bubble dialog
    editDialog,
    handleCloseDialog,
    selectedBubble,
    setSelectedBubble,
    setEditDialog,
    editDueDate,
    setEditDueDate,
    notifDialogOpen,
    setNotifDialogOpen,
    notifValue,
    setNotifValue,
    editNotifications,
    setEditNotifications,
    handleDeleteNotification,
    selectedTagId,
    setSelectedTagId,
    editBubbleSize,
    setEditBubbleSize,
    handleDeleteBubble,
    handleMarkAsDone,
    handleSaveBubble,
    onStopPulsing,
    showStopPulsing,
    editRecurrence,
    handleSetEditRecurrence,
    useRichTextEdit,
    handleToggleEditUseRichText,
    // Tag actions (used by the categories dialog)
    handleOpenTagDialog,
    handleDeleteTag,
    // Tag editor dialog
    tagDialog,
    handleCloseTagDialog,
    COLOR_PALETTE,
    editingTag,
    tagName,
    setTagName,
    tagColor,
    setTagColor,
    isColorAvailable,
    canCreateMoreTags,
    handleSaveTag,
    // Main menu drawer
    menuDrawerOpen,
    setMenuDrawerOpen,
    themeToggleProps,
    toggleTheme,
    bubbleBackgroundEnabled,
    handleToggleBubbleBackground,
    mainView,
    handleToggleMainView,
    categoriesPanelEnabled,
    handleToggleCategoriesPanel,
    setCategoriesDialog,
    setFontSettingsDialog,
    setAppearanceDialogOpen,
    setChangePasswordOpen,
    onOpenMindMap,
    setAboutOpen,
    handleLogout,
    handleExportJson,
    handleImportJson,
    // About dialog
    aboutOpen,
    // Filter drawer (bubbles view)
    filterDrawerOpen,
    setFilterDrawerOpen,
    filterTags,
    showNoTag,
    handleNoTagFilterChange,
    handleTagFilterChange,
    selectAllFilters,
    clearAllFilters,
    isAllSelected,
    getBubbleCountByTagForBubblesView,
    // Create bubble dialog
    createDialog,
    setCreateDialog,
    dueDate,
    setDueDate,
    createNotifications,
    setCreateNotifications,
    createRecurrence,
    handleSetCreateRecurrence,
    handleDeleteCreateNotification,
    bubbleSize,
    setBubbleSize,
    createNewBubble,
    useRichTextCreate,
    setUseRichTextCreate,
    // Categories dialog
    categoriesDialog,
    deletingTags,
    handleUndoDeleteTag,
    getBubbleCountByTag,
    // Font settings dialog
    fontSettingsDialog,
    fontSize,
    handleFontSizeChange,
    // Appearance dialog
    appearanceDialogOpen,
    themeModeState,
    setThemeMode,
    design,
    setDesign,
    designs,
    // Change password dialog
    changePasswordOpen,
    // Logout confirm dialog
    logoutDialog,
    setLogoutDialog,
    confirmLogout,
    // Task list drawer
    listViewDialog,
    setListViewDialog,
    listFilter,
    setListFilter,
    listSortBy,
    setListSortBy,
    listSortOrder,
    setListSortOrder,
    listFilterTags,
    setListFilterTags,
    listShowNoTag,
    setListShowNoTag,
    listSearchQuery,
    setListSearchQuery,
    handleListTagFilterChange,
    handleListNoTagFilterChange,
    clearAllListFilters,
    selectAllListFilters,
    getBubbleCountByTagForListView,
    isAllListFiltersSelected,
}) => {
    return (
        <>
            {/* Диалог редактирования */}
            <BubbleDialog
                mode="edit"
                open={editDialog}
                onClose={handleCloseDialog}
                t={t}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                initialTitle={selectedBubble?.title || ''}
                initialDescription={selectedBubble?.description || ''}
                editDueDate={editDueDate}
                setEditDueDate={setEditDueDate}
                isOverdue={isOverdue}
                notifDialogOpen={notifDialogOpen}
                setNotifDialogOpen={setNotifDialogOpen}
                notifValue={notifValue}
                setNotifValue={setNotifValue}
                editNotifications={editNotifications}
                setEditNotifications={setEditNotifications}
                handleDeleteNotification={handleDeleteNotification}
                tags={tags}
                selectedTagId={selectedTagId}
                setSelectedTagId={setSelectedTagId}
                editBubbleSize={editBubbleSize}
                setEditBubbleSize={setEditBubbleSize}
                handleDeleteBubble={handleDeleteBubble}
                handleMarkAsDone={handleMarkAsDone}
                handleSaveBubble={handleSaveBubble}
                onStopPulsing={onStopPulsing}
                showStopPulsing={showStopPulsing}
                editRecurrence={editRecurrence}
                setEditRecurrence={handleSetEditRecurrence}
                useRichText={useRichTextEdit}
                onToggleUseRichText={handleToggleEditUseRichText}
            />
            {/* Диалог создания/редактирования тега */}
            <TagEditorDialog
                open={tagDialog}
                onClose={handleCloseTagDialog}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                colorPalette={COLOR_PALETTE}
                editingTag={editingTag}
                tagName={tagName}
                setTagName={setTagName}
                tagColor={tagColor}
                setTagColor={setTagColor}
                isColorAvailable={isColorAvailable}
                canCreateMoreTags={canCreateMoreTags}
                onSave={handleSaveTag}
            />

            {/* Левое главное меню */}
            <MainMenuDrawer
                open={menuDrawerOpen}
                onClose={() => setMenuDrawerOpen(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                themeToggleProps={themeToggleProps}
                toggleTheme={toggleTheme}
                bubbleBackgroundEnabled={bubbleBackgroundEnabled}
                onToggleBubbleBackground={handleToggleBubbleBackground}
                mainView={mainView}
                onToggleMainView={handleToggleMainView}
                categoriesPanelEnabled={categoriesPanelEnabled}
                onToggleCategoriesPanel={handleToggleCategoriesPanel}
                onOpenCategoriesDialog={() => setCategoriesDialog(true)}
                onOpenFontSettingsDialog={() => setFontSettingsDialog(true)}
                onOpenAppearanceDialog={() => setAppearanceDialogOpen(true)}
                onOpenChangePasswordDialog={() => setChangePasswordOpen(true)}
                onOpenMindMap={onOpenMindMap}
                onAbout={() => setAboutOpen(true)}
                onLogout={handleLogout}
                onExportJson={handleExportJson}
                onImportJson={handleImportJson}
            />

            <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} t={t} />

            {/* Боковое меню фильтрации (вынесено в компонент) */}
            <TaskFilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                tags={tags}
                filterTags={filterTags}
                showNoTag={showNoTag}
                onToggleNoTag={handleNoTagFilterChange}
                onToggleTag={handleTagFilterChange}
                onSelectAll={selectAllFilters}
                onClearAll={clearAllFilters}
                isAllSelected={isAllSelected()}
                getBubbleCountByTagForBubblesView={getBubbleCountByTagForBubblesView}
            />

            {/* Диалог создания нового пузыря */}
            <BubbleDialog
                mode="create"
                open={createDialog}
                onClose={() => setCreateDialog(false)}
                t={t}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                dueDate={dueDate}
                setDueDate={setDueDate}
                isOverdue={isOverdue}
                notifDialogOpen={notifDialogOpen}
                setNotifDialogOpen={setNotifDialogOpen}
                notifValue={notifValue}
                setNotifValue={setNotifValue}
                createNotifications={createNotifications}
                setCreateNotifications={setCreateNotifications}
                createRecurrence={createRecurrence}
                setCreateRecurrence={handleSetCreateRecurrence}
                handleDeleteCreateNotification={handleDeleteCreateNotification}
                tags={tags}
                selectedTagId={selectedTagId}
                setSelectedTagId={setSelectedTagId}
                bubbleSize={bubbleSize}
                setBubbleSize={setBubbleSize}
                onCreate={createNewBubble}
                useRichText={useRichTextCreate}
                onToggleUseRichText={setUseRichTextCreate}
            />
            {/* Диалог управления категориями задач - вынесен в отдельный компонент с поддержкой DnD */}
            <TasksCategoriesDialog
                open={categoriesDialog}
                onClose={() => setCategoriesDialog(false)}
                tags={tags}
                deletingTags={deletingTags}
                canCreateMoreTags={canCreateMoreTags}
                onAddTag={() => {
                    if (canCreateMoreTags()) {
                        handleOpenTagDialog();
                    }
                }}
                onEditTag={(tag) => {
                    handleOpenTagDialog(tag);
                }}
                onDeleteTag={(tagId) => handleDeleteTag(tagId)}
                onUndoDeleteTag={(tagId) => handleUndoDeleteTag(tagId)}
                getBubbleCountByTag={getBubbleCountByTag}
                themeMode={themeMode}
                isMobile={isMobile}
                isSmallScreen={isSmallScreen}
                getDialogPaperStyles={getDialogPaperStyles}
                onReorderTags={(updated) => {
                    setTags(updated);
                    saveTagsToFirestore(updated);
                }}
            />

            {/* Диалог настроек шрифта */}
            <FontSettingsDialog
                open={fontSettingsDialog}
                onClose={() => setFontSettingsDialog(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                fontSize={fontSize}
                onFontSizeChange={handleFontSizeChange}
                onReset={() => handleFontSizeChange(8)}
            />

            {/* Диалог оформления */}
            <AppearanceDialog
                open={appearanceDialogOpen}
                onClose={() => setAppearanceDialogOpen(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeModeState}
                setThemeMode={setThemeMode}
                design={design}
                setDesign={setDesign}
                designs={designs}
                getDialogPaperStyles={getDialogPaperStyles}
            />

            {/* Диалог смены пароля */}
            <ChangePasswordDialog
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                getDialogPaperStyles={getDialogPaperStyles}
            />

            {/* Диалог подтверждения выхода */}
            <LogoutConfirmDialog
                open={logoutDialog}
                onClose={() => setLogoutDialog(false)}
                isMobile={isMobile}
                getDialogPaperStyles={getDialogPaperStyles}
                onConfirm={confirmLogout}
            />

            {/* Боковая панель списка задач */}
            <TaskListDrawer
                open={listViewDialog}
                onClose={() => setListViewDialog(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                bubbles={bubbles}
                setBubbles={setBubbles}
                tags={tags}
                listFilter={listFilter}
                setListFilter={setListFilter}
                listSortBy={listSortBy}
                setListSortBy={setListSortBy}
                listSortOrder={listSortOrder}
                setListSortOrder={setListSortOrder}
                listFilterTags={listFilterTags}
                setListFilterTags={setListFilterTags}
                listShowNoTag={listShowNoTag}
                setListShowNoTag={setListShowNoTag}
                listSearchQuery={listSearchQuery}
                setListSearchQuery={setListSearchQuery}
                setSelectedBubble={setSelectedBubble}
                setSelectedTagId={setSelectedTagId}
                setEditDialog={setEditDialog}
                handleListTagFilterChange={handleListTagFilterChange}
                handleListNoTagFilterChange={handleListNoTagFilterChange}
                clearAllListFilters={clearAllListFilters}
                selectAllListFilters={selectAllListFilters}
                getBubbleCountByTagForListView={getBubbleCountByTagForListView}
                isAllListFiltersSelected={isAllListFiltersSelected()}
                onOpenFilterMenu={() => setFilterDrawerOpen(true)}
            />
        </>
    );
};

export default BubblesDialogs;
