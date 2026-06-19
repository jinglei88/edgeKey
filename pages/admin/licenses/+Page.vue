<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">产品管理</h1>
          <p class="text-sm text-base-content/70">管理授权产品，每个产品对应一个独立的授权体系。</p>
        </div>
        <AppButton variant="primary" size="sm" @click="showForm = true">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新增产品
        </AppButton>
      </div>

      <!-- 产品表格 -->
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>编码</th>
              <th>名称</th>
              <th>描述</th>
              <th>API Key</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!productList.length">
              <td colspan="7" class="text-center text-base-content/60 py-8">还没有产品，点击"新增产品"创建</td>
            </tr>
            <tr v-for="row in productList" :key="row.id">
              <td>{{ row.id }}</td>
              <td><code class="bg-base-200 px-1.5 py-0.5 rounded text-xs">{{ row.code }}</code></td>
              <td class="font-medium">{{ row.name }}</td>
              <td class="text-sm text-base-content/60 max-w-xs truncate">{{ row.description || '-' }}</td>
              <td>
                <div class="flex items-center gap-1">
                  <code class="text-xs font-mono bg-base-200 px-1.5 py-0.5 rounded max-w-[120px] truncate">{{ row.apiKey }}</code>
                  <button class="btn btn-xs btn-ghost" @click="copyApiKey(row.apiKey, row.id)">
                    <svg v-if="copiedId !== row.id" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <svg v-else class="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </td>
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
      <h3 class="font-bold text-lg">{{ form.id ? '编辑产品' : '新增产品' }}</h3>
      <div class="space-y-4 py-4">
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">产品编码</span>
          <input v-model="form.code" class="input input-bordered w-full" placeholder="如 edgekey" :disabled="!!form.id" />
          <span class="label-text-alt text-base-content/50">唯一标识，创建后不可修改</span>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">产品名称</span>
          <input v-model="form.name" class="input input-bordered w-full" placeholder="如 EdgeKey 授权系统" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">描述</span>
          <textarea v-model="form.description" class="textarea textarea-bordered w-full" rows="3" placeholder="产品描述（可选）"></textarea>
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
</template>

<script setup lang="ts">
import { normalizeTelefuncError } from "../../../lib/app-error";
import { reactive, ref } from "vue";
import AppButton from "../../../components/AppButton.vue";
import { useData } from "vike-vue/useData";
import { onSaveLicenseProduct, onToggleLicenseProduct } from "./saveLicenseProduct.telefunc";
import type { Data } from "./+data";

const { products } = useData<Data>();

const productList = ref([...products]);
const saving = ref(false);
const errorMessage = ref("");
const showForm = ref(false);
const copiedId = ref<number | null>(null);

const form = reactive({
  id: undefined as number | undefined,
  code: "",
  name: "",
  description: "",
});

function resetForm() {
  form.id = undefined;
  form.code = "";
  form.name = "";
  form.description = "";
  errorMessage.value = "";
}

function closeForm() {
  showForm.value = false;
  resetForm();
}

function startEdit(product: (typeof products)[number]) {
  form.id = product.id;
  form.code = product.code;
  form.name = product.name;
  form.description = product.description ?? "";
  errorMessage.value = "";
  showForm.value = true;
}

async function handleSave() {
  saving.value = true;
  errorMessage.value = "";
  try {
    const result = await onSaveLicenseProduct({
      id: form.id,
      code: form.code,
      name: form.name,
      description: form.description,
    });
    const index = productList.value.findIndex((item) => item.id === result.id);
    if (index >= 0) {
      productList.value[index] = result;
    } else {
      productList.value.unshift(result);
    }
    closeForm();
  } catch (error) {
    errorMessage.value = normalizeTelefuncError(error, "保存失败");
  } finally {
    saving.value = false;
  }
}

async function handleToggle(product: (typeof products)[number]) {
  const nextStatus = product.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
  const result = await onToggleLicenseProduct({ id: product.id, status: nextStatus });
  productList.value = productList.value.map((item) => {
    if (item.id !== result.id) return item;
    return { ...item, status: result.status };
  });
}

async function copyApiKey(apiKey: string, id: number) {
  try {
    await navigator.clipboard.writeText(apiKey);
    copiedId.value = id;
    setTimeout(() => { copiedId.value = null; }, 2000);
  } catch { alert("复制失败"); }
}
</script>
