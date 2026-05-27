'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminShell } from '../../../../components/admin-shell';
import { AppModal } from '../../../../components/app-modal';

import {
	CATALOG_CATEGORIES_STORAGE_KEY,
	CATALOG_PRODUCTS_STORAGE_KEY,
	CATALOG_STORAGE_EVENT,
	LANDING_HERO_STORAGE_KEY,
	LANDING_SECTION_VISIBILITY_STORAGE_KEY,
	CATALOG_LISTS_STORAGE_KEY,
	CATALOG_HIDDEN_CATEGORIES_KEY,
	CATALOG_SELECTED_LIST_KEY,
	createSlug,
	defaultLandingHeroSettings,
	parseStoredArray,
	parseStoredValue,
	readStoredArray,
	readStoredValue,
	writeStoredArray,
	writeStoredValue,
	type CatalogCategoryRecord,
	type CatalogProductRecord,
	type CatalogListRecord,
	type LandingSectionVisibilityRecord,
	type LandingHeroSettingsRecord,
} from '../../../../lib/catalog-store';
import { canCurrentStaffAccessModule, hasAdminSession, STAFF_AUTH_EVENT } from '../../../../lib/staff-auth';
import { landingCategories } from '../../../../data/categories';

const PRODUCTS_EVENT = 'products-storage-updated';

type ProductStatus = 'active' | 'draft';

type CategoryRecord = CatalogCategoryRecord;

type ProductRecord = CatalogProductRecord;

const normalizeCatalogProduct = (
	product: Omit<CatalogProductRecord, 'status'> & { status?: string | null },
): CatalogProductRecord => ({
	...product,
	status: product.status === 'draft' ? 'draft' : 'active',
});

const isSeedProduct = (product: CatalogProductRecord) => product.id.startsWith('seed-prd-');
const isSeedList = (list: CatalogListRecord) => list.id.startsWith('seed-list-');

type ProductFormState = {
	name: string;
	sku: string;
	categoryId: string;
	bio: string;
	imageUrl: string;
	imageUrl2: string;
	imageUrl3: string;
	imageUrl4: string;
	price: string;
	costPrice: string;
	stock: string;
	status: ProductStatus;
	showOnLanding: boolean;
	showOnExtraLanding: boolean;
};

type LandingHeroFormState = {
	title: string;
	buttonText: string;
	buttonHref: string;
	imageUrl: string;
	backgroundColor: string;
	overlayOpacity: string;
};

const emptyProductForm = (): ProductFormState => ({
	name: '',
	sku: '',
	categoryId: '',
	bio: '',
	imageUrl: '',
	imageUrl2: '',
	imageUrl3: '',
	imageUrl4: '',
	price: '',
	costPrice: '',
	stock: '',
	status: 'active',
	showOnLanding: true,
	showOnExtraLanding: false,
});

const emptyLandingHeroForm = (): LandingHeroFormState => ({
	title: defaultLandingHeroSettings.title,
	buttonText: defaultLandingHeroSettings.buttonText,
	buttonHref: defaultLandingHeroSettings.buttonHref,
	imageUrl: defaultLandingHeroSettings.imageUrl,
	backgroundColor: defaultLandingHeroSettings.backgroundColor,
	overlayOpacity: String(defaultLandingHeroSettings.overlayOpacity),
});

const normalizeLandingHeroForm = (settings: Partial<LandingHeroSettingsRecord> | null | undefined): LandingHeroFormState => ({
	title: typeof settings?.title === 'string' && settings.title.trim() ? settings.title.trim() : defaultLandingHeroSettings.title,
	buttonText: typeof settings?.buttonText === 'string' && settings.buttonText.trim() ? settings.buttonText.trim() : defaultLandingHeroSettings.buttonText,
	buttonHref: typeof settings?.buttonHref === 'string' && settings.buttonHref.trim() ? settings.buttonHref.trim() : defaultLandingHeroSettings.buttonHref,
	imageUrl: typeof settings?.imageUrl === 'string' && settings.imageUrl.trim() ? settings.imageUrl.trim() : defaultLandingHeroSettings.imageUrl,
	backgroundColor:
		typeof settings?.backgroundColor === 'string' && settings.backgroundColor.trim()
			? settings.backgroundColor.trim()
			: defaultLandingHeroSettings.backgroundColor,
	overlayOpacity: String(
		Number.isFinite(Number(settings?.overlayOpacity))
			? Math.min(100, Math.max(0, Number(settings?.overlayOpacity)))
			: defaultLandingHeroSettings.overlayOpacity,
	),
});

const formatMoney = (value: number | string | null | undefined) => {
	const amount = typeof value === 'string' ? Number(value) : value;
	return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const buildImageUrls = (form: ProductFormState) => [form.imageUrl, form.imageUrl2, form.imageUrl3, form.imageUrl4].map((value) => value.trim()).filter(Boolean);

const defaultLandingSectionVisibility: LandingSectionVisibilityRecord = {
	hot: true,
	more: true,
};

const normalizeLandingSectionVisibility = (value: Partial<LandingSectionVisibilityRecord> | null | undefined): LandingSectionVisibilityRecord => ({
	hot: value?.hot !== false,
	more: value?.more !== false,
});

type CatalogSnapshot = Record<string, string>;

const buildCatalogBootstrap = (snapshot: CatalogSnapshot) => {
	const categories = parseStoredArray<CatalogCategoryRecord>(snapshot[CATALOG_CATEGORIES_STORAGE_KEY]);
	const products = parseStoredArray<CatalogProductRecord>(snapshot[CATALOG_PRODUCTS_STORAGE_KEY])
		.filter((product) => !isSeedProduct(product))
		.map(normalizeCatalogProduct);
	const lists = parseStoredArray<CatalogListRecord>(snapshot[CATALOG_LISTS_STORAGE_KEY]).filter((list) => !isSeedList(list));
	const landingSectionVisibility = normalizeLandingSectionVisibility(
		parseStoredValue<Partial<LandingSectionVisibilityRecord>>(snapshot[LANDING_SECTION_VISIBILITY_STORAGE_KEY]),
	);
	const heroForm = normalizeLandingHeroForm(parseStoredValue<Partial<LandingHeroSettingsRecord>>(snapshot[LANDING_HERO_STORAGE_KEY]));
	const selectedListId = parseStoredValue<string | null>(snapshot[CATALOG_SELECTED_LIST_KEY]) ?? null;

	return {
		categories,
		products,
		lists,
		landingSectionVisibility,
		heroForm,
		selectedListId,
	};
};

export default function AdminProductsPage({ readOnly = false, initialCatalogSnapshot = {} }: { readOnly?: boolean; initialCatalogSnapshot?: CatalogSnapshot }) {
	const initialCatalogBootstrap = buildCatalogBootstrap(initialCatalogSnapshot);
	const [categories, setCategories] = useState<CatalogCategoryRecord[]>(initialCatalogBootstrap.categories);
	const [products, setProducts] = useState<CatalogProductRecord[]>(initialCatalogBootstrap.products);
	const [heroForm, setHeroForm] = useState<LandingHeroFormState>(initialCatalogBootstrap.heroForm);
	const [isEditingHeroSettings, setIsEditingHeroSettings] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [categoryFilter, setCategoryFilter] = useState('all');
	const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
	const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
	const [categoryName, setCategoryName] = useState('');
	const [categoryDescription, setCategoryDescription] = useState('');
	const [categoryImageUrl, setCategoryImageUrl] = useState('');
	const [isProductModalOpen, setIsProductModalOpen] = useState(false);
	const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
	const [isHotListOpen, setIsHotListOpen] = useState(false);
	const [openMoreFromAdminListId, setOpenMoreFromAdminListId] = useState<string | null>(null);
	const [isLandingListEditorOpen, setIsLandingListEditorOpen] = useState(false);
	const [landingListEditorTarget, setLandingListEditorTarget] = useState<'hot' | 'more' | null>(null);
	const [landingListEditorOpenCategoryId, setLandingListEditorOpenCategoryId] = useState<string | null>(null);
	const [landingListEditorProductIds, setLandingListEditorProductIds] = useState<string[]>([]);
	const [landingListEditorInactiveIds, setLandingListEditorInactiveIds] = useState<string[]>([]);
	const [editingProductId, setEditingProductId] = useState<string | null>(null);
	const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm());
	const [landingSectionVisibility, setLandingSectionVisibility] = useState<LandingSectionVisibilityRecord>(initialCatalogBootstrap.landingSectionVisibility);
	const [notice, setNotice] = useState<string | null>(null);
	const [confirmAction, setConfirmAction] = useState<{
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);
	const feedbackReadyRef = useRef(false);

	useEffect(() => {
		const revalidateSite = () => {
			void fetch('/api/revalidate-site', { method: 'POST', cache: 'no-store', credentials: 'include' }).catch(() => null);
		};

		window.addEventListener(CATALOG_STORAGE_EVENT, revalidateSite);
		window.addEventListener(PRODUCTS_EVENT, revalidateSite);

		return () => {
			window.removeEventListener(CATALOG_STORAGE_EVENT, revalidateSite);
			window.removeEventListener(PRODUCTS_EVENT, revalidateSite);
		};
	}, []);

	// Compute whether the current client should be allowed to perform edits.
	const [canEdit, setCanEdit] = useState(false);

	useEffect(() => {
		const update = () => {
			const admin = hasAdminSession();
			const staffCanEdit = canCurrentStaffAccessModule('products', 'edit');
			setCanEdit(Boolean(admin || staffCanEdit));
		};

		update();
		window.addEventListener('storage', update);
		window.addEventListener(STAFF_AUTH_EVENT, update as EventListener);

		return () => {
			window.removeEventListener('storage', update);
			window.removeEventListener(STAFF_AUTH_EVENT, update as EventListener);
		};
	}, []);

	const openConfirm = (title: string, message: string, onConfirm: () => void) => {
		setConfirmAction({ title, message, onConfirm });
	};

	const closeConfirm = () => {
		setConfirmAction(null);
	};

	const runConfirm = () => {
		if (!confirmAction) return;
		const action = confirmAction;
		setConfirmAction(null);
		action.onConfirm();
	};

	const refreshCatalogFromServer = async () => {
		try {
			const response = await fetch('/api/catalog-state', { cache: 'no-store', credentials: 'include' });
			if (!response.ok) return;

			const payload = (await response.json()) as { snapshot?: CatalogSnapshot };
			const snapshot = payload.snapshot ?? {};

			setCategories(parseStoredArray<CatalogCategoryRecord>(snapshot[CATALOG_CATEGORIES_STORAGE_KEY]));
			setProducts(
				parseStoredArray<CatalogProductRecord>(snapshot[CATALOG_PRODUCTS_STORAGE_KEY])
					.filter((product) => !isSeedProduct(product))
					.map(normalizeCatalogProduct),
			);
			setLists(parseStoredArray<CatalogListRecord>(snapshot[CATALOG_LISTS_STORAGE_KEY]).filter((list) => !isSeedList(list)));
			setHeroForm(normalizeLandingHeroForm(parseStoredValue<Partial<LandingHeroSettingsRecord>>(snapshot[LANDING_HERO_STORAGE_KEY])));
			setLandingSectionVisibility(
				normalizeLandingSectionVisibility(
					parseStoredValue<Partial<LandingSectionVisibilityRecord>>(snapshot[LANDING_SECTION_VISIBILITY_STORAGE_KEY]),
				),
			);
			setSelectedListIdState(parseStoredValue<string | null>(snapshot[CATALOG_SELECTED_LIST_KEY]) ?? null);
		} catch {
			// Keep the current snapshot if the server is temporarily unavailable.
		}
	};

	useEffect(() => {
		const onChange: EventListener = () => refresh();
		void refreshCatalogFromServer();

		// One-time sync: hide default landing categories that no longer exist in the shared snapshot
		try {
			const defaultSlugs = landingCategories.map((c) => c.slug);
			const hidden = parseStoredArray<string>(initialCatalogSnapshot[CATALOG_HIDDEN_CATEGORIES_KEY]);
			const missing = defaultSlugs.filter(
				(slug) => !initialCatalogBootstrap.categories.some((category) => category.slug === slug) && !hidden.includes(slug),
			);
			if (missing.length) {
				writeStoredArray(CATALOG_HIDDEN_CATEGORIES_KEY, [...missing, ...hidden], { silent: !feedbackReadyRef.current });
			}
		} catch {
			// ignore
		}

		const refresh = () => {
			void refreshCatalogFromServer();
		};
		window.addEventListener('storage', onChange);
		window.addEventListener(CATALOG_STORAGE_EVENT, onChange);

		return () => {
			window.removeEventListener('storage', onChange);
			window.removeEventListener(CATALOG_STORAGE_EVENT, onChange);
		};
	}, []);

	const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

	const filteredProducts = useMemo(() => {
		const q = searchText.trim().toLowerCase();
		return products.filter((product) => {
			const matchesQuery =
				!q ||
				`${product.name} ${product.sku} ${categoryMap.get(product.categoryId)?.name ?? ''}`
					.toLowerCase()
					.includes(q);
			const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;
			const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
			return matchesQuery && matchesCategory && matchesStatus;
		});
	}, [products, searchText, categoryFilter, statusFilter, categoryMap]);

	const totalActive = useMemo(() => products.filter((product) => product.status === 'active').length, [products]);
	const totalLanding = useMemo(() => products.filter((product) => product.showOnLanding).length, [products]);
	const totalExtraLanding = useMemo(() => products.filter((product) => product.showOnExtraLanding).length, [products]);

	const openCreateProduct = () => {
		setEditingProductId(null);
		setProductForm(emptyProductForm());
		setIsProductModalOpen(true);
	};

	const openCreateCategory = () => {
		setEditingCategoryId(null);
		setCategoryName('');
		setCategoryDescription('');
		setCategoryImageUrl('');
		setIsCategoryModalOpen(true);
	};

	const openEditCategory = (category: CategoryRecord) => {
		setEditingCategoryId(category.id);
		setCategoryName(category.name);
		setCategoryDescription(category.description);
		setCategoryImageUrl(category.imageUrl);
		setIsCategoryModalOpen(true);
	};

	const openEditProduct = (product: ProductRecord) => {
		setEditingProductId(product.id);
		setProductForm({
			name: product.name,
			sku: product.sku,
			categoryId: product.categoryId,
			bio: product.bio,
			imageUrl: product.imageUrls?.[0] ?? '',
			imageUrl2: product.imageUrls?.[1] ?? '',
			imageUrl3: product.imageUrls?.[2] ?? '',
			imageUrl4: product.imageUrls?.[3] ?? '',
			price: String(product.price),
			costPrice: String(product.costPrice),
			stock: String(product.stock),
			status: product.status,
			showOnLanding: product.showOnLanding,
			showOnExtraLanding: product.showOnExtraLanding,
		});
		setIsProductModalOpen(true);
	};

	const saveCategory = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedName = categoryName.trim();
		if (!trimmedName) return;

		const slug = createSlug(trimmedName);
		if (!editingCategoryId && !slug) {
			setNotice('Category name must contain letters or numbers.');
			return;
		}

		const actionLabel = editingCategoryId ? 'update this category' : 'create this category';

		const exists = categories.some((category) => category.name.toLowerCase() === trimmedName.toLowerCase() && category.id !== editingCategoryId);
		if (exists) {
			setNotice('Category already exists.');
			return;
		}

		const nextCategory: CatalogCategoryRecord = {
			id: editingCategoryId ?? slug,
			slug: editingCategoryId ?? slug,
			name: trimmedName,
			description: categoryDescription.trim(),
			imageUrl: categoryImageUrl.trim(),
			isActive: true,
			createdAt: editingCategoryId ? categories.find((category) => category.id === editingCategoryId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
		};

		const nextCategories = editingCategoryId
			? categories.map((category) => (category.id === editingCategoryId ? nextCategory : category))
			: [nextCategory, ...categories];

		openConfirm('Save category?', `Do you want to ${actionLabel}?`, () => {
			writeStoredArray(CATALOG_CATEGORIES_STORAGE_KEY, nextCategories);
			setCategoryName('');
			setCategoryDescription('');
			setCategoryImageUrl('');
			setIsCategoryModalOpen(false);
			setEditingCategoryId(null);
			setNotice(`${editingCategoryId ? 'Category updated' : 'Category created'}: ${nextCategory.name}`);
		});
	};

	const deleteCategory = (categoryId: string, categoryNameValue: string) => {
		openConfirm('Delete category?', `Delete category "${categoryNameValue}" and all linked products?`, () => {
		const removedProductIds = new Set(products.filter((product) => product.categoryId === categoryId).map((product) => product.id));

		// capture the slug of the category being deleted so landing can hide default/demo category
		const target = categories.find((c) => c.id === categoryId);
		const nextCategories = categories.filter((category) => category.id !== categoryId);

		writeStoredArray(CATALOG_CATEGORIES_STORAGE_KEY, nextCategories);

		if (target && target.slug) {
			try {
				const hidden = readStoredArray<string>(CATALOG_HIDDEN_CATEGORIES_KEY);
				if (!hidden.includes(target.slug)) {
					writeStoredArray(CATALOG_HIDDEN_CATEGORIES_KEY, [target.slug, ...hidden]);
				}
			} catch {
				// ignore
			}
		}

		if (removedProductIds.size > 0) {
			const nextProducts = products.filter((product) => !removedProductIds.has(product.id));
			writeStoredArray(CATALOG_PRODUCTS_STORAGE_KEY, nextProducts);

			const nextLists = lists
				.map((list) => ({
					...list,
					productIds: list.productIds.filter((productId) => !removedProductIds.has(productId)),
				}))
				.filter((list) => list.productIds.length > 0);
			writeStoredArray(CATALOG_LISTS_STORAGE_KEY, nextLists);

			if (selectedListId && !nextLists.some((list) => list.id === selectedListId)) {
				setSelectedList(null);
			} else {
				refreshLists();
			}

			setNotice(`Deleted category: ${categoryNameValue} and ${removedProductIds.size} linked product(s).`);
			return;
		}

		refreshLists();
		setNotice(`Deleted category: ${categoryNameValue}`);
		});
	};

	const saveProduct = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const name = productForm.name.trim();
		const sku = productForm.sku.trim();
		const bio = productForm.bio.trim();
		const categoryId = productForm.categoryId;
		const imageUrls = buildImageUrls(productForm);
		const price = Number(productForm.price);
		const costPrice = Number(productForm.costPrice);
		const stock = Number(productForm.stock);

		if (!name || !sku || !categoryId || !bio || !imageUrls.length || !Number.isFinite(price) || !Number.isFinite(costPrice) || !Number.isFinite(stock)) {
			setNotice('Please fill all required product fields.');
			return;
		}

		

		const skuTaken = products.some((product) => product.sku.toLowerCase() === sku.toLowerCase() && product.id !== editingProductId);
		if (skuTaken) {
			setNotice('SKU already exists. Use a unique SKU.');
			return;
		}

		if (editingProductId) {
			const nextProducts = products.map((product) =>
				product.id === editingProductId
					? {
						...product,
						name,
						sku,
						categoryId,
						bio,
						imageUrls,
						price,
						costPrice,
						stock,
						status: productForm.status,
						showOnLanding: productForm.showOnLanding,
						showOnExtraLanding: productForm.showOnExtraLanding,
						showOnSecondaryLanding: product.showOnSecondaryLanding ?? false,
						updatedAt: new Date().toISOString(),
					}
					: product,
			);

			openConfirm('Save product?', 'Update this product?', () => {
				writeStoredArray(CATALOG_PRODUCTS_STORAGE_KEY, nextProducts);
				setNotice(`Product updated: ${name}`);
				setIsProductModalOpen(false);
				setEditingProductId(null);
				setProductForm(emptyProductForm());
			});
		} else {
			const now = new Date().toISOString();
			const nextProduct: CatalogProductRecord = {
				id: `prd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				name,
				sku,
				categoryId,
				bio,
				imageUrls,
				price,
				costPrice,
				stock,
				status: productForm.status,
				showOnLanding: productForm.showOnLanding,
				showOnExtraLanding: productForm.showOnExtraLanding,
				showOnSecondaryLanding: false,
				createdAt: now,
				updatedAt: now,
			};

			openConfirm('Save product?', 'Create this product?', () => {
				writeStoredArray(CATALOG_PRODUCTS_STORAGE_KEY, [nextProduct, ...products]);
				setNotice(`Product added: ${name}`);
				setIsProductModalOpen(false);
				setEditingProductId(null);
				setProductForm(emptyProductForm());
			});
		}
	};

	const deleteProduct = (productId: string, productName: string) => {
		openConfirm('Delete product?', `Delete product "${productName}" everywhere?`, () => {
			const nextProducts = products.filter((product) => product.id !== productId);
			writeStoredArray(CATALOG_PRODUCTS_STORAGE_KEY, nextProducts);

			const nextLists = lists
				.map((list) => ({ ...list, productIds: list.productIds.filter((id) => id !== productId) }))
				.filter((list) => list.productIds.length > 0);
			writeStoredArray(CATALOG_LISTS_STORAGE_KEY, nextLists);

			if (selectedListId && !nextLists.some((list) => list.id === selectedListId)) {
				setSelectedList(null);
			} else {
				refreshLists();
			}

			setNotice(`Deleted product everywhere: ${productName}`);
		});
	};

	

	const toggleLanding = (productId: string) => {
		openConfirm('Update homepage visibility?', 'Toggle whether this product shows on the homepage?', () => {
			writeStoredArray(
				CATALOG_PRODUCTS_STORAGE_KEY,
				products.map((product) =>
					product.id === productId
						? { ...product, showOnLanding: !product.showOnLanding, updatedAt: new Date().toISOString() }
						: product,
			),
			);
		});
	};

	const toggleExtraLanding = (productId: string) => {
		openConfirm('Update secondary landing visibility?', 'Toggle whether this product shows in the second homepage list?', () => {
			writeStoredArray(
				CATALOG_PRODUCTS_STORAGE_KEY,
				products.map((product) =>
					product.id === productId
						? { ...product, showOnExtraLanding: !product.showOnExtraLanding, updatedAt: new Date().toISOString() }
						: product,
			),
			);
		});
	};


	// Lists manager (stored in localStorage under CATALOG_LISTS_STORAGE_KEY)
	const [lists, setLists] = useState<CatalogListRecord[]>(initialCatalogBootstrap.lists);
	const [selectedListId, setSelectedListIdState] = useState<string | null>(initialCatalogBootstrap.selectedListId);
	const [isListModalOpen, setIsListModalOpen] = useState(false);
	const [editingListId, setEditingListId] = useState<string | null>(null);
	const [listName, setListName] = useState('');
	const [listProductIds, setListProductIds] = useState<string[]>([]);

	const landingVisibilityStats = useMemo(() => {
		const hiddenLandingProducts = products.filter((product) => !product.showOnLanding).length;
		const hiddenExtraLandingProducts = products.filter((product) => !product.showOnExtraLanding).length;
		const visibleLandingLists = lists.filter((list) => list.visibleOnLanding !== false && list.productIds.length > 0).length;
		const hiddenLandingLists = lists.filter((list) => list.visibleOnLanding === false).length;
		const emptyLandingLists = lists.filter((list) => list.productIds.length === 0).length;

		return {
			hiddenLandingProducts,
			hiddenExtraLandingProducts,
			visibleLandingLists,
			hiddenLandingLists,
			emptyLandingLists,
		};
	}, [lists, products]);

	const refreshLists = () => {
		const storedLists = readStoredArray<CatalogListRecord>(CATALOG_LISTS_STORAGE_KEY);
		const filteredLists = storedLists.filter((list) => !isSeedList(list));
		if (filteredLists.length !== storedLists.length) {
			writeStoredArray(CATALOG_LISTS_STORAGE_KEY, filteredLists);
		}
		setLists(filteredLists);
		const selected = readStoredValue<string | null>(CATALOG_SELECTED_LIST_KEY);
		setSelectedListIdState(selected ?? null);
	};

	const setSelectedList = (listId: string | null) => {
		if (listId === null) {
			window.localStorage.removeItem(CATALOG_SELECTED_LIST_KEY);
			window.localStorage.setItem('fs-communication:last-updated', String(Date.now()));
		} else {
			window.localStorage.setItem(CATALOG_SELECTED_LIST_KEY, JSON.stringify(listId));
			window.localStorage.setItem('fs-communication:last-updated', String(Date.now()));
			writeStoredValue(LANDING_SECTION_VISIBILITY_STORAGE_KEY, {
				...landingSectionVisibility,
				more: true,
			});
		}
		window.dispatchEvent(new Event(CATALOG_STORAGE_EVENT));
		refreshLists();
	};

	const selectedList = lists.find((list) => list.id === selectedListId) ?? null;

	const openLandingListEditor = (target: 'hot' | 'more') => {
		setLandingListEditorTarget(target);
		setLandingListEditorOpenCategoryId(null);

		if (target === 'hot') {
			setLandingListEditorProductIds(products.filter((product) => product.showOnLanding).map((product) => product.id));
			setLandingListEditorInactiveIds(products.filter((product) => product.showOnLanding && product.status === 'draft').map((product) => product.id));
		} else {
			setLandingListEditorProductIds(selectedList?.productIds ?? []);
			setLandingListEditorInactiveIds(
				(selectedList?.productIds ?? []).filter((productId) => products.find((product) => product.id === productId)?.status === 'draft'),
			);
		}

		setIsLandingListEditorOpen(true);
	};

	const toggleLandingListEditorProduct = (productId: string) => {
		setLandingListEditorProductIds((current) =>
			current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
		);
		setLandingListEditorInactiveIds((current) => current.filter((id) => id !== productId));
	};

	const toggleLandingListEditorInactive = (productId: string) => {
		setLandingListEditorInactiveIds((current) =>
			current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
		);
		setLandingListEditorProductIds((current) => (current.includes(productId) ? current : [...current, productId]));
	};

	const activateLandingListEditorProduct = (productId: string) => {
		setLandingListEditorProductIds((current) => (current.includes(productId) ? current : [...current, productId]));
		setLandingListEditorInactiveIds((current) => current.filter((id) => id !== productId));
	};

	const deactivateLandingListEditorProduct = (productId: string) => {
		setLandingListEditorProductIds((current) => (current.includes(productId) ? current : [...current, productId]));
		setLandingListEditorInactiveIds((current) => (current.includes(productId) ? current : [...current, productId]));
	};

	const saveLandingListEditor = () => {
		if (!landingListEditorTarget) return;

		const activeIds = new Set(landingListEditorProductIds.filter((id) => !landingListEditorInactiveIds.includes(id)));
		const inactiveIds = new Set(landingListEditorInactiveIds);

		const nextProducts = products.map((product) => {
			const isSelected = activeIds.has(product.id) || inactiveIds.has(product.id);
			const nextStatus: ProductStatus = inactiveIds.has(product.id) ? 'draft' : 'active';

			if (landingListEditorTarget === 'hot') {
				if (!isSelected) {
					return product.showOnLanding ? { ...product, showOnLanding: false, updatedAt: new Date().toISOString() } : product;
				}

				return {
					...product,
					showOnLanding: !inactiveIds.has(product.id),
					status: nextStatus,
					updatedAt: new Date().toISOString(),
				};
			}

			if (!isSelected) {
				return product;
			}

			return {
				...product,
				status: nextStatus,
				showOnLanding: product.showOnLanding,
				updatedAt: new Date().toISOString(),
			};
		});

		writeStoredArray(CATALOG_PRODUCTS_STORAGE_KEY, nextProducts);

		if (landingListEditorTarget === 'more') {
			if (selectedList) {
				const nextLists = lists.map((list) =>
					list.id === selectedList.id
						? { ...list, productIds: landingListEditorProductIds.slice(), createdAt: list.createdAt }
						: list,
				);
				writeStoredArray(CATALOG_LISTS_STORAGE_KEY, nextLists);
				setSelectedListIdState(selectedList.id);
			}
		}

		setNotice(`${landingListEditorTarget === 'hot' ? "What's Hot Right Now" : 'More From Admin'} updated.`);
		setIsLandingListEditorOpen(false);
		setLandingListEditorTarget(null);
		setLandingListEditorOpenCategoryId(null);
	};

	const editHotRightNowList = () => openLandingListEditor('hot');

	const disableHotRightNowList = () => {
		openConfirm('Disable What\'s Hot Right Now?', 'Remove its items from the homepage? This will mark the items as draft.', () => {
			writeStoredArray(
				CATALOG_PRODUCTS_STORAGE_KEY,
				products.map((product) =>
					product.showOnLanding
						? { ...product, showOnLanding: false, status: 'draft', updatedAt: new Date().toISOString() }
						: product,
			),
			);
			setNotice('What\'s Hot Right Now disabled.');
		});
	};

	const deleteHotRightNowList = () => {
		openConfirm('Delete What\'s Hot Right Now?', 'This will remove the section and its products from all views.', () => {
			const removedIds = new Set(products.filter((product) => product.showOnLanding).map((product) => product.id));
			if (removedIds.size) {
				const nextProducts = products.filter((product) => !removedIds.has(product.id));
				writeStoredArray(CATALOG_PRODUCTS_STORAGE_KEY, nextProducts);

				const nextLists = lists
					.map((list) => ({
						...list,
						productIds: list.productIds.filter((productId) => !removedIds.has(productId)),
					}))
					.filter((list) => list.productIds.length > 0);
				writeStoredArray(CATALOG_LISTS_STORAGE_KEY, nextLists);

				if (selectedListId && !nextLists.some((list) => list.id === selectedListId)) {
					setSelectedList(null);
				} else {
					refreshLists();
				}
			}

			writeStoredValue(LANDING_SECTION_VISIBILITY_STORAGE_KEY, {
				...landingSectionVisibility,
				hot: false,
			});

			setNotice('What\'s Hot Right Now deleted everywhere.');
		});
	};

	const editMoreFromAdminList = (list: CatalogListRecord) => {
		openManageList(list);
	};

	const disableMoreFromAdminList = (list: CatalogListRecord) => {
		openConfirm('Disable list on landing?', `Disable "${list.name}" on landing?`, () => {
			const existing = readStoredArray<CatalogListRecord>(CATALOG_LISTS_STORAGE_KEY);
			const next = existing.map((l) => (l.id === list.id ? { ...l, visibleOnLanding: false } : l));
			writeStoredArray(CATALOG_LISTS_STORAGE_KEY, next);
			refreshLists();
			setNotice(`List disabled: ${list.name}`);
		});
	};

	const enableMoreFromAdminList = (list: CatalogListRecord) => {
		openConfirm('Enable list on landing?', `Enable "${list.name}" on landing?`, () => {
			const existing = readStoredArray<CatalogListRecord>(CATALOG_LISTS_STORAGE_KEY);
			const next = existing.map((l) => (l.id === list.id ? { ...l, visibleOnLanding: true } : l));
			writeStoredArray(CATALOG_LISTS_STORAGE_KEY, next);
			refreshLists();
			setNotice(`List enabled: ${list.name}`);
		});
	};

	const deleteMoreFromAdminList = (list: CatalogListRecord) => {
		openConfirm('Delete list everywhere?', `Delete list "${list.name}" everywhere?`, () => {
			const removed = deleteList(list.id);
			if (!removed) return;

			const remainingCount = lists.filter((item) => item.id !== list.id).length;
			writeStoredValue(LANDING_SECTION_VISIBILITY_STORAGE_KEY, {
				...landingSectionVisibility,
				more: remainingCount > 0,
			});
			setOpenMoreFromAdminListId((current) => (current === list.id ? null : current));
			setNotice(`List deleted everywhere: ${list.name}`);
		});
	};

	useEffect(() => {
		const syncFromSnapshot = () => {
			setCategories(initialCatalogBootstrap.categories);
			setProducts(initialCatalogBootstrap.products);
			setLists(initialCatalogBootstrap.lists);
			setHeroForm(initialCatalogBootstrap.heroForm);
			setLandingSectionVisibility(initialCatalogBootstrap.landingSectionVisibility);
			setSelectedListIdState(initialCatalogBootstrap.selectedListId);
		};

		syncFromSnapshot();
		void refreshCatalogFromServer();

		const onChange: EventListener = () => {
			void refreshCatalogFromServer();
		};
		window.addEventListener('storage', onChange);
		window.addEventListener(CATALOG_STORAGE_EVENT, onChange);
		feedbackReadyRef.current = true;
		return () => {
			window.removeEventListener('storage', onChange);
			window.removeEventListener(CATALOG_STORAGE_EVENT, onChange);
		};
	}, []);

	const openCreateList = () => {
		setEditingListId(null);
		setListName('');
		setListProductIds([]);
		setIsListModalOpen(true);
	};

	const openManageList = (list: CatalogListRecord) => {
		setEditingListId(list.id);
		setListName(list.name);
		setListProductIds(list.productIds.slice());
		setIsListModalOpen(true);
	};

	const saveList = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = listName.trim();
		if (!trimmed) return;
		const now = new Date().toISOString();
		const existing = readStoredArray<CatalogListRecord>(CATALOG_LISTS_STORAGE_KEY);
		let next: CatalogListRecord[];
		let nextSelectedListId: string | null = selectedListId;
		if (editingListId) {
			next = existing.map((l) => (l.id === editingListId ? { ...l, name: trimmed, productIds: listProductIds } : l));
			nextSelectedListId = selectedListId ?? editingListId;
		} else {
			const createdId = String(Math.random()).slice(2);
			next = [{ id: createdId, name: trimmed, productIds: listProductIds.slice(), createdAt: now, visibleOnLanding: true }, ...existing];
			nextSelectedListId = createdId;
			// Activate all products in the newly created list
			const allProducts = readStoredArray<CatalogProductRecord>(CATALOG_PRODUCTS_STORAGE_KEY);
			const updatedProducts = allProducts.map((p) =>
				listProductIds.includes(p.id) ? { ...p, status: 'active' } : p
			);
			writeStoredArray(CATALOG_PRODUCTS_STORAGE_KEY, updatedProducts);
		}
		writeStoredArray(CATALOG_LISTS_STORAGE_KEY, next);
		writeStoredValue(LANDING_SECTION_VISIBILITY_STORAGE_KEY, {
			...landingSectionVisibility,
			more: true,
		});
		if (nextSelectedListId) {
			setSelectedList(nextSelectedListId);
		}
		setIsListModalOpen(false);
	};

	const deleteList = (listId: string) => {
		const existing = readStoredArray<CatalogListRecord>(CATALOG_LISTS_STORAGE_KEY);
		const target = existing.find((l) => l.id === listId);
		if (!target) {
			setNotice('List not found.');
			return false;
		}
		const next = existing.filter((l) => l.id !== listId);
		writeStoredArray(CATALOG_LISTS_STORAGE_KEY, next);

		// If the deleted list was the currently selected list for landing, clear it.
		const selected = readStoredValue<string | null>(CATALOG_SELECTED_LIST_KEY);
		if (selected === listId) {
			window.localStorage.removeItem(CATALOG_SELECTED_LIST_KEY);
			window.localStorage.setItem('fs-communication:last-updated', String(Date.now()));
			window.dispatchEvent(new Event(CATALOG_STORAGE_EVENT));
		}

		// Update in-memory lists immediately so the admin UI reflects the deletion right away.
		refreshLists();
		setNotice(`Deleted list: ${target.name}`);
		return true;
	};

	const toggleProductInList = (productId: string) => {
		setListProductIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
	};

	const saveLandingHero = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		openConfirm('Save landing hero?', 'Save the landing hero settings?', () => {
			const opacityNum = Number(heroForm.overlayOpacity);
			const nextHero = {
				title: heroForm.title.trim() || defaultLandingHeroSettings.title,
				buttonText: heroForm.buttonText.trim() || defaultLandingHeroSettings.buttonText,
				buttonHref: defaultLandingHeroSettings.buttonHref,
				imageUrl: heroForm.imageUrl.trim() || defaultLandingHeroSettings.imageUrl,
				backgroundColor: defaultLandingHeroSettings.backgroundColor,
				overlayOpacity: Number.isFinite(opacityNum) ? Math.min(100, Math.max(0, opacityNum)) : defaultLandingHeroSettings.overlayOpacity,
			};

			writeStoredValue(LANDING_HERO_STORAGE_KEY, nextHero);
			setHeroForm(normalizeLandingHeroForm(nextHero));
			setNotice('Landing hero updated.');
			setIsEditingHeroSettings(false);
		});
	};

	const cancelHeroEdit = () => {
		const stored = normalizeLandingHeroForm(readStoredValue<Partial<LandingHeroSettingsRecord>>(LANDING_HERO_STORAGE_KEY));
		setHeroForm(stored);
		setIsEditingHeroSettings(false);
	};

	return (
		<AdminShell active="products" title="Products">
			<div className="flex flex-col gap-3">


				{/* Landing preview: What's Hot + More From Admin */}
				<section className="order-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
						<div>
							<h3 className="text-sm font-bold text-slate-900">Landing Preview</h3>
							<p className="text-xs text-slate-500">Preview products that appear on the storefront landing page.</p>
						</div>
					</div>
					<div className="p-4">
						<div className="mb-4 overflow-hidden rounded-lg border border-slate-200">
							<div className="grid grid-cols-1 gap-2 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:grid-cols-[1.4fr_0.7fr_1.9fr] sm:gap-0">
								<p>Landing List</p>
								<p>Items</p>
								<p>Actions</p>
							</div>
							{!landingSectionVisibility.hot && !landingSectionVisibility.more ? (
								<div className="border-t border-slate-200 px-3 py-3 text-xs text-slate-500">No landing lists visible. Create/select a list or edit products to show sections again.</div>
							) : null}
							{landingSectionVisibility.hot ? (
								<>
							<div className="grid grid-cols-1 gap-2 border-t border-slate-200 px-3 py-2 text-xs sm:grid-cols-[1.4fr_0.7fr_1.9fr] sm:items-center sm:gap-0">
								<p className="font-semibold text-slate-900">What&apos;s Hot Right Now</p>
								<p className="text-slate-700">{products.filter((p) => p.showOnLanding).length}</p>
									<div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
									  {canEdit ? (
										<>
											<button type="button" onClick={editHotRightNowList} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">Edit</button>
											<button type="button" onClick={disableHotRightNowList} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">Disable</button>
											<button type="button" onClick={deleteHotRightNowList} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">Delete</button>
										</>
									) : null}
									<button type="button" aria-label={isHotListOpen ? "Hide What's Hot Right Now items" : "Show What's Hot Right Now items"} onClick={() => setIsHotListOpen((current) => !current)} className="rounded-md px-2 py-1 text-lg font-bold leading-none text-cyan-700 transition hover:bg-cyan-50">{isHotListOpen ? '▾' : '▸'}</button>
								</div>
							</div>
							{isHotListOpen ? (
								<div className="border-t border-slate-200 px-3 py-2">
									<div className="flex flex-wrap items-start gap-3">
										{products.filter((p) => p.showOnLanding).length ? (
											products
												.filter((p) => p.showOnLanding)
												.map((p) => (
													<div key={p.id} className="w-[140px] rounded-md border border-slate-200 bg-white p-2 text-xs">
														<div className="h-20 w-full overflow-hidden rounded-md bg-slate-50">
															{p.imageUrls?.[0] ? <img src={p.imageUrls?.[0]} alt={p.name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-slate-400">No img</div>}
														</div>
														<div className="mt-2 font-semibold text-slate-900 truncate">{p.name}</div>
														<div className="text-[11px] text-slate-500">SKU: {p.sku}</div>
													</div>
												))
										) : (
											<div className="text-xs text-slate-500">No products marked for landing.</div>
										)}
									</div>
								</div>
							) : null}
								</>
							) : null}
							{landingSectionVisibility.more ? (
								<>
								{lists.length ? (
									lists.map((list) => {
										const isOpen = openMoreFromAdminListId === list.id;
										const isDisabled = list.visibleOnLanding === false;
										const listProducts = list.productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean);
										return (
											<div key={list.id}>
												<div className="grid grid-cols-1 gap-2 border-t border-slate-200 px-3 py-2 text-xs sm:grid-cols-[1.4fr_0.7fr_1.9fr] sm:items-center sm:gap-0">
													<p className="font-semibold text-slate-900">{list.name}</p>
													<p className="text-slate-700">{list.productIds.length}</p>
														<div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
															{canEdit ? (
																<>
																	<button type="button" onClick={() => editMoreFromAdminList(list)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">Edit</button>
																	<button
																		type="button"
																		onClick={() => (isDisabled ? enableMoreFromAdminList(list) : disableMoreFromAdminList(list))}
																		className={`rounded-md px-2 py-1 text-[11px] font-bold ${isDisabled ? 'border border-emerald-300 bg-emerald-50 text-emerald-700' : 'border border-amber-300 bg-amber-50 text-amber-700'}`}
																	>
																		{isDisabled ? 'Enable' : 'Disable'}
																	</button>
																	<button type="button" onClick={() => deleteMoreFromAdminList(list)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">Delete</button>
																</>
															) : null}
															<button type="button" aria-label={isOpen ? `Hide ${list.name} items` : `Show ${list.name} items`} onClick={() => setOpenMoreFromAdminListId(isOpen ? null : list.id)} className="rounded-md px-2 py-1 text-lg font-bold leading-none text-cyan-700 transition hover:bg-cyan-50">{isOpen ? '▾' : '▸'}</button>
														</div>
												</div>
												{isOpen ? (
													<div className="border-t border-slate-200 px-3 py-2">
														<div className="mt-2 flex flex-wrap items-start gap-3">
															{listProducts.length ? (
																listProducts.map((p) => (
																	<div key={p!.id} className="w-[140px] rounded-md border border-slate-200 bg-white p-2 text-xs">
																		<div className="h-20 w-full overflow-hidden rounded-md bg-slate-50">
																			{p!.imageUrls?.[0] ? <img src={p!.imageUrls?.[0]} alt={p!.name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-slate-400">No img</div>}
																		</div>
																		<div className="mt-2 font-semibold text-slate-900 truncate">{p!.name}</div>
																		<div className="text-[11px] text-slate-500">SKU: {p!.sku}</div>
																	</div>
																))
															) : (
																<div className="text-xs text-slate-500">No items in this list.</div>
															)}
														</div>
													</div>
												) : null}
											</div>
										);
									})
								) : (
									<div className="border-t border-slate-200 px-3 py-3 text-xs text-slate-500">No admin lists yet. Create one to display it on landing.</div>
								)}
								</>
							) : null}
						</div>
					</div>
				</section>
				<section className="order-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700 p-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-bold text-white">Product Catalog</h2>
								<p className="text-xs text-blue-100">Create products, manage categories, and control landing-page visibility.</p>
							</div>
								<div className="flex flex-wrap items-center gap-2">
															{canEdit ? (
										<>
											<button
												type="button"
												onClick={openCreateCategory}
												className="rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
											>
												Add Category
											</button>
											<button
												type="button"
												onClick={openCreateProduct}
												className="rounded-md border border-white bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
											>
												Add Product
											</button>
											<button
												type="button"
												onClick={openCreateList}
												className="rounded-md border border-white bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
											>
												Add List
											</button>
										</>
									) : null}
								</div>
						</div>
					</div>

					<div className="grid gap-3 p-4 md:grid-cols-4">
						<div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
							<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total Products</p>
							<p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{products.length}</p>
						</div>
						<div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
							<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Active</p>
							<p className="mt-1 text-2xl font-extrabold tracking-tight text-emerald-700">{totalActive}</p>
						</div>
					</div>
				</section>

				<section className="order-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
							<div className="border-b border-violet-200 bg-gradient-to-r from-violet-600 to-blue-600 p-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-bold text-white">Landing Hero Settings</h2>
								<p className="text-xs text-violet-100">Edit the homepage banner and overlay.</p>
							</div>
							<div>
										{!readOnly ? (
											<button
												type="button"
												onClick={() => setIsEditingHeroSettings((current) => !current)}
												className="rounded-md border border-white bg-white px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
											>
												{isEditingHeroSettings ? 'Editing Hero' : 'Edit Hero'}
											</button>
										) : null}
							</div>
						</div>
						</div>
						<form className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]" onSubmit={saveLandingHero}>
						<div className="space-y-3">
							<label className="block text-xs font-semibold text-slate-600">
								Headline
								<input
									type="text"
									value={heroForm.title}
									onChange={(event) => setHeroForm((current) => ({ ...current, title: event.target.value }))}
									disabled={!isEditingHeroSettings}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
								/>
							</label>
							<label className="block text-xs font-semibold text-slate-600">
								Button Text
								<input
									type="text"
									value={heroForm.buttonText}
									onChange={(event) => setHeroForm((current) => ({ ...current, buttonText: event.target.value }))}
									disabled={!isEditingHeroSettings}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
								/>
							</label>
							<label className="block text-xs font-semibold text-slate-600">
								Background Image URL
								<input
									type="url"
									value={heroForm.imageUrl}
									onChange={(event) => setHeroForm((current) => ({ ...current, imageUrl: event.target.value }))}
									disabled={!isEditingHeroSettings}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
									placeholder="https://..."
								/>
							</label>
						</div>
						<div className="space-y-3">
							<label className="block text-xs font-semibold text-slate-600">
								Overlay Strength
								<input
									type="range"
									min="0"
									max="100"
									value={heroForm.overlayOpacity}
									onChange={(event) => setHeroForm((current) => ({ ...current, overlayOpacity: event.target.value }))}
									disabled={!isEditingHeroSettings}
									className="mt-2 w-full accent-blue-600 disabled:cursor-not-allowed"
								/>
								<div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
									<span>Transparent</span>
									<span>{heroForm.overlayOpacity}%</span>
									<span>Dense</span>
								</div>
							</label>
							{isEditingHeroSettings ? (
								<div className="flex items-center justify-end gap-2 pt-1">
									<button
										type="button"
										onClick={() => {
										openConfirm('Reset landing hero?', 'Reset the landing hero settings back to defaults?', () => {
											setHeroForm(emptyLandingHeroForm());
										});
									}}
										className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
									>
										Reset
									</button>
									<button
										type="button"
										onClick={cancelHeroEdit}
										className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
									>
										Cancel
									</button>
									<button type="submit" className="rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700">
										Save
									</button>
								</div>
							) : (
								<p className="pt-1 text-right text-[11px] text-slate-500">Tap Edit to change the landing hero settings.</p>
							)}
						</div>
					</form>
				</section>

				<section className="order-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
						<div>
							<h2 className="text-sm font-bold text-slate-900">Category Manager</h2>
							<p className="text-xs text-slate-500">Edit or remove categories and those changes will reflect across the storefront in real time.</p>
						</div>
					</div>
					<div className="space-y-2 p-3">
						{categories.length ? (
							categories.map((category) => {
								const linkedProducts = products.filter((product) => product.categoryId === category.id).length;
								const categoryProducts = products.filter((product) => product.categoryId === category.id);
								const isOpen = openCategoryId === category.id;

								return (
									<article key={category.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
												{category.imageUrl ? <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" /> : null}
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<h3 className="truncate text-[12px] font-bold text-slate-900">{category.name}</h3>
														<p className="truncate text-[10px] text-slate-500">{category.description || 'No description provided.'}</p>
													</div>
													<span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">{linkedProducts} items</span>
												</div>
											</div>
												<div className="flex shrink-0 items-center gap-1.5">
													{canEdit ? (
														<>
															<button type="button" onClick={() => openEditCategory(category)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-slate-50">Edit</button>
															<button type="button" onClick={() => deleteCategory(category.id, category.name)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 transition hover:bg-rose-100">Delete</button>
														</>
													) : null}
													<button type="button" aria-label={isOpen ? `Hide items in ${category.name}` : `Show items in ${category.name}`} onClick={() => setOpenCategoryId(isOpen ? null : category.id)} className="rounded-md px-2 py-1 text-lg font-bold leading-none text-cyan-700 transition hover:bg-cyan-50">{isOpen ? '▾' : '▸'}</button>
											</div>
										</div>

										{isOpen ? (
											<div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
												<p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Items In {category.name}</p>
												{categoryProducts.length ? (
													<div className="space-y-1.5">
														{categoryProducts.map((product) => (
															<div key={product.id} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px]">
																<div className="min-w-0 pr-2">
																	<p className="truncate font-semibold text-slate-900">{product.name}</p>
																	<p className="truncate text-slate-500">SKU: {product.sku}</p>
																</div>
																<span className="shrink-0 font-bold text-slate-700">{formatMoney(product.price)}</span>
															</div>
														))}
													</div>
												) : (
													<p className="text-xs text-slate-500">No products in this category yet.</p>
												)}
											</div>
										) : null}
									</article>
								);
							})
						) : (
							<div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">No stored categories yet. Add one to start managing storefront categories in real time.</div>
						)}
					</div>
				</section>

				<section className="order-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<button
						type="button"
						onClick={() => setIsProductsDropdownOpen((current) => !current)}
						className="flex w-full items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
					>
						<div>
							<h2 className="text-sm font-bold text-slate-900">Products</h2>
							<p className="text-xs text-slate-500">Click to {isProductsDropdownOpen ? 'hide' : 'open'} the full products list.</p>
						</div>
						<span className="text-lg font-bold text-slate-600">{isProductsDropdownOpen ? '▾' : '▸'}</span>
					</button>

					{isProductsDropdownOpen ? (
						<>
							<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
								<div className="grid gap-2 md:grid-cols-3">
							<input
								type="text"
								value={searchText}
								onChange={(event) => setSearchText(event.target.value)}
								placeholder="Search by name, SKU, category"
								className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-blue-500"
							/>
							<select
								value={categoryFilter}
								onChange={(event) => setCategoryFilter(event.target.value)}
								className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
							>
								<option value="all">All categories</option>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
							<select
								value={statusFilter}
								onChange={(event) => setStatusFilter(event.target.value as 'all' | ProductStatus)}
								className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
							>
								<option value="all">All status</option>
								<option value="active">Active</option>
								<option value="draft">Draft</option>
							</select>
								</div>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
							<thead className="border-b border-slate-200 bg-slate-50">
								<tr>
									<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Product</th>
									<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Category</th>
									<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Price</th>
									<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Stock</th>
									<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Status</th>
									<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{filteredProducts.length ? (
									filteredProducts.map((product) => (
										<tr key={product.id} className="transition-colors hover:bg-slate-50">
											<td className="px-4 py-3">
												<div className="flex items-center gap-3">
													{product.imageUrls?.[0] ? (
														<img src={product.imageUrls?.[0]} alt={product.name} className="h-10 w-10 rounded-md border border-slate-200 object-cover" />
													) : (
														<div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-500">No img</div>
													)}
													<div>
														<div className="font-semibold text-slate-900">{product.name}</div>
														<div className="text-[11px] text-slate-500">SKU: {product.sku}</div>
													</div>
												</div>
											</td>
											<td className="px-4 py-3 text-slate-700">{categoryMap.get(product.categoryId)?.name ?? 'Uncategorized'}</td>
											<td className="px-4 py-3 font-bold text-slate-900">{formatMoney(product.price)}</td>
											<td className="px-4 py-3 text-slate-700">{product.stock}</td>
											<td className="px-4 py-3">
												<span className={`rounded-md px-2 py-1 text-[11px] font-bold ${product.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
													{product.status === 'active' ? 'Active' : 'Draft'}
												</span>
											</td>
											<td className="px-4 py-3">
												<div className="flex flex-wrap items-center gap-2">
													{canEdit ? (
														<>
															<button type="button" onClick={() => openEditProduct(product)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50">Edit</button>

															<button type="button" onClick={() => deleteProduct(product.id, product.name)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100">Delete</button>
														</>
													) : null}
												</div>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={6} className="px-4 py-8 text-center text-slate-500">No products found.</td>
									</tr>
								)}
									</tbody>
								</table>
							</div>
						</>
					) : null}
				</section>

				{notice ? <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">{notice}</p> : null}
			</div>

			<AppModal
				open={isCategoryModalOpen}
				onClose={() => setIsCategoryModalOpen(false)}
				cardClassName="w-full max-w-lg overflow-hidden"
			>
				<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
					<h3 className="text-sm font-bold text-slate-900">{editingCategoryId ? 'Edit Category' : 'Add Category'}</h3>
				</div>
				<form className="space-y-3 p-4" onSubmit={saveCategory}>
					<label className="block text-xs font-semibold text-slate-600">
						Category Name
						<input
							type="text"
							value={categoryName}
							onChange={(event) => setCategoryName(event.target.value)}
							className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
							required
						/>
					</label>
					<label className="block text-xs font-semibold text-slate-600">
						Description
						<textarea
							value={categoryDescription}
							onChange={(event) => setCategoryDescription(event.target.value)}
							rows={3}
							className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
						/>
					</label>
					<label className="block text-xs font-semibold text-slate-600">
						Image URL
						<input
							type="url"
							value={categoryImageUrl}
							onChange={(event) => setCategoryImageUrl(event.target.value)}
							className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
							placeholder="https://..."
						/>
					</label>
					<div className="flex items-center justify-end gap-2">
						<button type="button" onClick={() => { setIsCategoryModalOpen(false); setEditingCategoryId(null); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">Cancel</button>
						<button type="submit" className="rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700">{editingCategoryId ? 'Update Category' : 'Save Category'}</button>
					</div>
				</form>
			</AppModal>

			<AppModal open={isListModalOpen} onClose={() => setIsListModalOpen(false)} cardClassName="w-full max-w-4xl overflow-hidden">
				<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
					<h3 className="text-sm font-bold text-slate-900">{editingListId ? 'Manage List' : 'Create List'}</h3>
				</div>
				<form className="space-y-3 p-4 max-h-[70vh] overflow-y-auto" onSubmit={saveList}>
					<label className="block text-xs font-semibold text-slate-600">
						List Name
						<input type="text" value={listName} onChange={(e) => setListName(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" required />
					</label>
					<div className="mt-2 text-xs text-slate-600">Select products to include in this list:</div>
					<div className="mt-2 grid gap-2">
						{products.map((product) => (
							<label key={product.id} className="inline-flex items-center gap-2 text-sm">
								<input type="checkbox" checked={listProductIds.includes(product.id)} onChange={() => toggleProductInList(product.id)} />
								<span className="truncate">{product.name} — {product.sku}</span>
							</label>
						))}
					</div>
					<div className="flex items-center justify-end gap-2">
						<button type="button" onClick={() => setIsListModalOpen(false)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">Cancel</button>
						<button type="submit" className="rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700">Save List</button>
					</div>
				</form>
			</AppModal>

			<AppModal open={isLandingListEditorOpen} onClose={() => setIsLandingListEditorOpen(false)} cardClassName="w-full max-w-4xl overflow-hidden">
				<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
					<h3 className="text-sm font-bold text-slate-900">
						{landingListEditorTarget === 'hot' ? "Edit What's Hot Right Now" : 'Edit More From Admin'}
					</h3>
				</div>
				<div className="space-y-3 p-4">
					<p className="text-xs text-slate-500">Open a category to see its items. Activate adds an item to the list. Deactivate keeps it inside the editor but marks it inactive.</p>
					<div className="max-h-[52vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
						<div className="space-y-2">
							{categories.map((category) => {
								const categoryProducts = products.filter((product) => product.categoryId === category.id);
								const isOpen = landingListEditorOpenCategoryId === category.id;
								return (
									<section key={category.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
										<button
											type="button"
											onClick={() => setLandingListEditorOpenCategoryId((current) => (current === category.id ? null : category.id))}
											className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
										>
											<div className="min-w-0">
												<div className="truncate text-sm font-bold text-slate-900">{category.name}</div>
												<div className="text-[11px] text-slate-500">{categoryProducts.length} item{categoryProducts.length === 1 ? '' : 's'}</div>
											</div>
											<div className="text-slate-400">{isOpen ? '▾' : '▸'}</div>
										</button>
										{isOpen ? (
											<div className="border-t border-slate-200 bg-slate-50 p-3">
												<div className="space-y-2">
													{categoryProducts.length ? (
														categoryProducts.map((product) => {
															const included = landingListEditorProductIds.includes(product.id);
															const inactive = landingListEditorInactiveIds.includes(product.id);
															const imageUrl = product.imageUrls?.[0] ?? '';
															const stateLabel = inactive ? 'Inactive' : included ? 'Active' : 'Not Added';
															const stateClass = inactive
																? 'bg-amber-100 text-amber-800'
																: included
																	? 'bg-emerald-100 text-emerald-800'
																	: 'bg-slate-200 text-slate-700';

															return (
																<article key={product.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
																	<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
																		{imageUrl ? (
																			<img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
																		) : (
																			<div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">No image</div>
																		)}
																	</div>
																	<div className="min-w-0 flex-1">
																		<div className="flex items-center gap-2">
																			<h4 className="truncate text-sm font-bold text-slate-900">{product.name}</h4>
																			<span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${stateClass}`}>{stateLabel}</span>
																		</div>
																		<p className="truncate text-[11px] text-slate-500">SKU: {product.sku}</p>
																	</div>
																	<div className="flex shrink-0 items-center gap-2">
																		<button
																			type="button"
																			onClick={() => {
																				if (inactive || !included) {
																					activateLandingListEditorProduct(product.id);
																				} else {
																					deactivateLandingListEditorProduct(product.id);
																				}
																			}}
																			className={`rounded-md px-3 py-2 text-xs font-bold transition ${inactive || !included ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
																		>
																			{inactive || !included ? 'Activate' : 'Deactivate'}
																		</button>
																	</div>
																</article>
															);
														})
													) : (
														<p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">No products in this category.</p>
													)}
												</div>
											</div>
										) : null}
									</section>
								);
							})}
						</div>
					</div>
					<div className="flex items-center justify-end gap-2">
						<button type="button" onClick={() => setIsLandingListEditorOpen(false)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">Cancel</button>
						<button type="button" onClick={saveLandingListEditor} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700">Save Changes</button>
					</div>
				</div>
			</AppModal>

			<AppModal
				open={isProductModalOpen}
				onClose={() => setIsProductModalOpen(false)}
				cardClassName="w-full max-w-4xl max-h-[88vh] overflow-hidden"
			>
				<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
					<h3 className="text-sm font-bold text-slate-900">{editingProductId ? 'Edit Product' : 'Add Product'}</h3>
				</div>
				<form className="max-h-[calc(88vh-64px)] space-y-3 overflow-y-auto p-4" onSubmit={saveProduct}>
					<div className="grid gap-3 md:grid-cols-2">
						<label className="text-xs font-semibold text-slate-600">
							Product Name
							<input type="text" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" required />
						</label>
						<label className="text-xs font-semibold text-slate-600">
							SKU
							<input type="text" value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" required />
						</label>
						<label className="text-xs font-semibold text-slate-600">
							Category
							<select value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700" required>
								<option value="">Select category</option>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>{category.name}</option>
								))}
							</select>
						</label>
						<label className="text-xs font-semibold text-slate-600">
							Primary Image URL
							<input type="url" value={productForm.imageUrl} onChange={(event) => setProductForm((current) => ({ ...current, imageUrl: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" placeholder="https://..." />
						</label>
						<label className="text-xs font-semibold text-slate-600">
							Selling Price
							<input type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" required />
						</label>
						<label className="text-xs font-semibold text-slate-600">
							Cost Price
							<input type="number" min="0" step="0.01" value={productForm.costPrice} onChange={(event) => setProductForm((current) => ({ ...current, costPrice: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" required />
						</label>
						<label className="text-xs font-semibold text-slate-600">
							Stock Qty
							<input type="number" min="0" step="1" value={productForm.stock} onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" required />
						</label>
						<label className="text-xs font-semibold text-slate-600">
							Status
							<select value={productForm.status} onChange={(event) => setProductForm((current) => ({ ...current, status: event.target.value as ProductStatus }))} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
								<option value="active">Active</option>
								<option value="draft">Draft</option>
							</select>
						</label>
					</div>

					<label className="block text-xs font-semibold text-slate-600">
						Bio
						<textarea value={productForm.bio} onChange={(event) => setProductForm((current) => ({ ...current, bio: event.target.value }))} rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" required />
					</label>

					<div className="grid gap-3 md:grid-cols-2">
						<label className="text-xs font-semibold text-slate-600">
							Image URL 1
							<input type="url" value={productForm.imageUrl} onChange={(event) => setProductForm((current) => ({ ...current, imageUrl: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" placeholder="https://..." required />
						</label>
						<label className="text-xs font-semibold text-slate-600">
							Image URL 2
							<input type="url" value={productForm.imageUrl2} onChange={(event) => setProductForm((current) => ({ ...current, imageUrl2: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" placeholder="https://..." />
						</label>
						<label className="text-xs font-semibold text-slate-600">
							Image URL 3
							<input type="url" value={productForm.imageUrl3} onChange={(event) => setProductForm((current) => ({ ...current, imageUrl3: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" placeholder="https://..." />
						</label>
						<label className="text-xs font-semibold text-slate-600">
							Image URL 4
							<input type="url" value={productForm.imageUrl4} onChange={(event) => setProductForm((current) => ({ ...current, imageUrl4: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" placeholder="https://..." />
						</label>
					</div>

					<div className="flex items-center justify-end gap-2">
						<button type="button" onClick={() => setIsProductModalOpen(false)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">Cancel</button>
						<button type="submit" className="rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700">Save Product</button>
					</div>
				</form>
			</AppModal>

			{confirmAction ? (
				<AppModal open={Boolean(confirmAction)} onClose={closeConfirm} cardClassName="w-full max-w-md overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl transition-all duration-200 ease-out">
					<>
						<style>{`
							.products-confirm-card { animation: products-confirm-pop 160ms cubic-bezier(.2,.8,.2,1); }
							@keyframes products-confirm-pop {
								from { opacity: 0; transform: translateY(8px) scale(.98); }
								to { opacity: 1; transform: translateY(0) scale(1); }
							}
						`}</style>
						<div className="products-confirm-card">
							<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
								<h3 className="text-sm font-bold text-slate-900">{confirmAction.title}</h3>
							</div>
							<div className="space-y-4 p-4">
								<p className="text-sm text-slate-600">{confirmAction.message}</p>
								<div className="flex items-center justify-end gap-2">
									<button type="button" onClick={closeConfirm} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
										Cancel
									</button>
									<button type="button" onClick={runConfirm} className="rounded-lg border border-rose-600 bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700">
										Confirm
									</button>
								</div>
							</div>
						</div>
					</>
				</AppModal>
			) : null}
		</AdminShell>
	);
}
