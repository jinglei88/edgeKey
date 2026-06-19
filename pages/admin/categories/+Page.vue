<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">分类管理</h1>
          <p class="text-sm text-base-content/70">管理前台商品分类、排序和启用状态。</p>
        </div>
        <AppButton variant="primary" size="sm" @click="showForm = true">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新增分类
        </AppButton>
      </div>

      <!-- 分类表格 -->
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>Slug</th>
              <th>描述</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!categoryList.length">
              <td colspan="7" class="text-center text-base-content/60 py-8">还没有分类，点击"新增分类"创建</td>
            </tr>
            <tr v-for="row in categoryList" :key="row.id">
              <td>{{ row.id }}</td>
              <td class="font-medium">{{ row.name }}</td>
              <td><code class="bg-base-200 px-1.5 py-0.5 rounded text-xs">{{ row.slug }}</code></td>
              <td class="text-sm text-base-content/60 max-w-xs truncate">{{ row.description || '-' }}</td>
              <td>{{ row.sort }}</td>
              <td>
                <span class="badge badge-sm" :class="row.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost'">
                  {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
                </span>
              </td>
              <td>
                <div class="flex gap-1">
                  <button class="btn btn-xs btn-outline" @click="startEdit(row)">编辑</button>
                  <button class="btn btn-xs btn-outline" @click="handleToggle(row)">
                    {{ row.status === 'ACTIVE' ? '停用' : '启用' }}
                  </button>
                  <button class="btn btn-xs btn-error" @click="handleDelete(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- 新增/编辑弹窗 -->
  <dialog :class="{ 'modal modal-open': showForm }" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">{{ form.id ? '编辑分类' : '新增分类' }}</h3>
      <div class="space-y-4 py-4">
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">名称</span>
          <input v-model="form.name" class="input input-bordered w-full" placeholder="分类名称" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">Slug</span>
          <input v-model="form.slug" class="input input-bordered w-full" placeholder="留空则自动生成" />
          <span class="label-text-alt text-base-content/50">URL 友好的唯一标识</span>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">描述</span>
          <textarea v-model="form.description" class="textarea textarea-bordered w-full" rows="3" placeholder="分类描述（可选）"></textarea>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">排序</span>
          <input v-model.number="form.sort" type="number" class="input input-bordered w-full" />
          <span class="label-text-alt text-base-content/50">数字越小越靠前</span>
        </label>
      </div>
      <p v-if="errorMessage" class="text-sm text-error mb-2">{{ errorMessage }}</p>
      <div class="modal-action">
        <AppButton variant="ghost" @click="closeForm">取消</AppButton>
        <AppButton variant="primary" :loading="saving" @click="handleSave">保存</AppButton>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="closeForm">
      <button>close</button>
    </form>
  </dialog>

  <!-- 删除确认弹窗 -->
  <dialog :class="{ 'modal modal-open': showConfirm }" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">删除分类</h3>
      <p class="py-4">确认删除分类"{{ deleteTarget?.name }}"吗？</p>
      <div class="modal-action">
        <AppButton variant="ghost" @click="showConfirm = false">取消</AppButton>
        <AppButton variant="danger" @click="confirmDelete">删除</AppButton>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="showConfirm = false">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { normalizeTelefuncError } from "../../../lib/app-error";
import { reactive, ref } from "vue";
import AppButton from "../../../components/AppButton.vue";
import { useData } from "vike-vue/useData";
import { onDeleteCategory } from "./deleteCategory.telefunc";
import { onSaveCategory } from "./saveCategory.telefunc";
import { onToggleCategory } from "./toggleCategory.telefunc";
import type { Data } from "./+data";

const { categories } = useData<Data>();

const categoryList = ref([...categories]);
const saving = ref(false);
const errorMessage = ref("");
const showForm = ref(false);
const showConfirm = ref(false);
const deleteTarget = ref<any>(null);

const form = reactive({
  id: undefined as number | undefined,
  name: "",
  slug: "",
  description: "",
  sort: 0,
});

function resetForm() {
  form.id = undefined;
  form.name = "";
  form.slug = "";
  form.description = "";
  form.sort = 0;
  errorMessage.value = "";
}

function closeForm() {
  showForm.value = false;
  resetForm();
}

function startEdit(category: (typeof categories)[number]) {
  form.id = category.id;
  form.name = category.name;
  form.slug = category.slug;
  form.description = category.description ?? "";
  form.sort = category.sort;
  errorMessage.value = "";
  showForm.value = true;
}

async function handleSave() {
  saving.value = true;
  errorMessage.value = "";
  try {
    const result = await onSaveCategory({
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      sort: form.sort,
    });
    const index = categoryList.value.findIndex((item) => item.id === result.id);
    if (index >= 0) {
      categoryList.value[index] = result;
    } else {
      categoryList.value.unshift(result);
    }
    categoryList.value = [...categoryList.value].sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort;
      return b.id - a.id;
    });
    closeForm();
  } catch (error) {
    errorMessage.value = normalizeTelefuncError(error, "保存失败");
  } finally {
    saving.value = false;
  }
}

async function handleToggle(category: (typeof categories)[number]) {
  const nextStatus = category.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
  const result = await onToggleCategory({ id: category.id, status: nextStatus });
  categoryList.value = categoryList.value.map((item) => {
    if (item.id !== result.id) return item;
    return { ...item, status: result.status };
  });
}

function handleDelete(category: any) {
  deleteTarget.value = category;
  showConfirm.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await onDeleteCategory({ id: deleteTarget.value.id });
    categoryList.value = categoryList.value.filter((item) => item.id !== deleteTarget.value.id);
    if (form.id === deleteTarget.value.id) resetForm();
  } catch (error) {
    alert(normalizeTelefuncError(error, "删除失败"));
  }
  showConfirm.value = false;
  deleteTarget.value = null;
}
</script>
