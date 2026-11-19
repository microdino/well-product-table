const { __, sprintf } = wp.i18n;
import { useEffect, useState } from 'react';
import {
	Button,
	Card,
	CardBody,
	CheckboxControl,
	FormTokenField,
	RadioControl,
	Snackbar,
	SelectControl,
	Spinner,
	TextControl,
	ToggleControl,
	__experimentalHeading as Heading,
	__experimentalNumberControl as NumberControl,
	__experimentalText as Text,
} from '@wordpress/components';

const API_PATH = '/wp/v2/adpro_option';
const COLUMN_OPTIONS = [
	[ 'id', 'ID' ],
	[ 'sku', 'SKU' ],
	[ 'name', __( 'Name', 'well-product-table' ) ],
	[ 'description', __( 'Description', 'well-product-table' ) ],
	[ 'summary', __( 'Summary', 'well-product-table' ) ],
	[ 'date', __( 'Published date', 'well-product-table' ) ],
	[ 'modified', __( 'Last modified date', 'well-product-table' ) ],
	[ 'image', __( 'Image', 'well-product-table' ) ],
	[ 'stock', __( 'Stock', 'well-product-table' ) ],
	[ 'reviews', __( 'Reviews', 'well-product-table' ) ],
	[ 'weight', __( 'Weight', 'well-product-table' ) ],
	[ 'dimensions', __( 'Dimensions', 'well-product-table' ) ],
	[ 'price', __( 'Price', 'well-product-table' ) ],
	[ 'buy', __( 'Buy', 'well-product-table' ) ],
	[ 'button', __( 'Button', 'well-product-table' ) ],
	[ 'total', __( 'Total', 'well-product-table' ) ],
	[ 'categories', __( 'Categories', 'well-product-table' ) ],
	[ 'tags', __( 'Tags', 'well-product-table' ) ],
	[ 'tax:pa_color', __( 'Color', 'well-product-table' ) ],
	[ 'tax:pa_size', __( 'Size', 'well-product-table' ) ],
	[ 'author', __( 'Author', 'well-product-table' ) ],
].map( ( [ value, label ] ) => ( { value, label } ) );
const FILTER_OPTIONS = [
	[ 'categories', __( 'Categories', 'well-product-table' ) ],
	[ 'tags', __( 'Tags', 'well-product-table' ) ],
	[ 'tax:pa_color', __( 'Color', 'well-product-table' ) ],
	[ 'tax:pa_size', __( 'Size', 'well-product-table' ) ],
	[ 'product_type', __( 'Product Type', 'well-product-table' ) ],
	[ 'product_visibility', __( 'Product Visibility', 'well-product-table' ) ],
	[ 'author', __( 'Author', 'well-product-table' ) ],
].map( ( [ value, label ] ) => ( { value, label } ) );
const makeItem = ( value, options ) => {
	const option = options.find( ( item ) => item.value === value );
	return {
		id: `${ value }-${ Date.now() }-${ Math.random() }`,
		value,
		label: option?.label || value,
	};
};
const normalizeItems = ( value, options ) => {
	const aliases = {
		color: 'tax:pa_color',
		size: 'tax:pa_size',
		'add-to-cart': 'buy',
	};
	const normalized = Array.isArray( value )
		? value
		: typeof value === 'string'
		? value.split( ',' ).filter( Boolean )
		: [];
	return normalized.map( ( item ) => {
		const current =
			typeof item === 'string' ? { value: item.trim() } : item;
		const itemValue = aliases[ current.value ] || current.value;
		const option = options.find( ( choice ) => choice.value === itemValue );
		return {
			...current,
			id: current.id || `${ itemValue }-${ Math.random() }`,
			value: itemValue,
			label: current.label || option?.label || itemValue,
		};
	} );
};
const defaults = {
	tableName: '',
	displayIn: 'shortcode',
	queryType: 'all',
	queryCategories: [],
	queryTags: [],
	queryProducts: [],
	queryBrands: [],
	excludeProducts: [],
	excludeCategories: [],
	shopPage: false,
	searchPage: false,
	categoryPage: false,
	tagPage: false,
	attributesPage: false,
	brandPage: false,
	columns: [ 'sku', 'name', 'stock', 'price', 'total', 'buy' ].map(
		( value ) => makeItem( value, COLUMN_OPTIONS )
	),
	quantitySelector: true,
	variationStyle: 'dropdown',
	productsPerPage: 20,
	searchFilters: [ makeItem( 'tax:pa_color', FILTER_OPTIONS ) ],
	sortBy: 'default',
	sortDirection: 'automatic',
	descriptionLength: 15,
};

const QueryPicker = ( { label, type, value = [], onChange } ) => {
	const [ search, setSearch ] = useState( '' );
	const [ options, setOptions ] = useState( [] );
	const [ labels, setLabels ] = useState( {} );
	useEffect( () => {
		let active = true;
		const timer = setTimeout( async () => {
			try {
				const results = await wp.apiFetch( {
					path: `/prta/v1/query-options?type=${ type }&search=${ encodeURIComponent(
						search
					) }&include=${ value.join( ',' ) }`,
				} );
				if ( active ) {
					setOptions( results );
					setLabels( ( current ) => ( {
						...current,
						...Object.fromEntries(
							results.map( ( item ) => [
								item.value,
								item.label,
							] )
						),
					} ) );
				}
			} catch ( error ) {
				if ( active ) {
					setOptions( [] );
				}
			}
		}, 200 );
		return () => {
			active = false;
			clearTimeout( timer );
		};
	}, [ type, search, value.join( ',' ) ] );
	const tokenFor = ( id ) => `${ labels[ id ] || `#${ id }` } (#${ id })`;
	const tokenId = ( token ) => {
		const text = typeof token === 'string' ? token : token.value;
		return Number( text.match( /\(#(\d+)\)$/ )?.[ 1 ] || 0 );
	};
	return (
		<FormTokenField
			label={ label }
			placeholder={
				type === 'products'
					? __( 'Search and select products…', 'well-product-table' )
					: type === 'categories'
					? __(
							'Search and select categories…',
							'well-product-table'
					  )
					: type === 'tags'
					? __( 'Search and select tags…', 'well-product-table' )
					: __( 'Search and select brands…', 'well-product-table' )
			}
			value={ value.map( tokenFor ) }
			suggestions={ options
				.filter( ( option ) => ! value.includes( option.value ) )
				.map( ( option ) => tokenFor( option.value ) ) }
			onInputChange={ setSearch }
			onChange={ ( tokens ) =>
				onChange( [
					...new Set(
						tokens
							.map( tokenId )
							.filter(
								( id ) =>
									value.includes( id ) ||
									options.some(
										( option ) => option.value === id
									)
							)
					),
				] )
			}
			__experimentalValidateInput={ ( token ) => {
				const id = tokenId( token );
				return (
					value.includes( id ) ||
					options.some( ( option ) => option.value === id )
				);
			} }
			__experimentalShowHowTo={ false }
			__experimentalAutoSelectFirstMatch
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>
	);
};

const DynamicFieldList = ( { items, options, placeholder, onChange } ) => {
	const [ selected, setSelected ] = useState( '' );
	const [ dragged, setDragged ] = useState( null );
	const add = () => {
		if ( ! selected || items.some( ( item ) => item.value === selected ) ) {
			return;
		}
		onChange( [ ...items, makeItem( selected, options ) ] );
		setSelected( '' );
	};
	const move = ( target ) => {
		if ( dragged === null || dragged === target ) {
			return;
		}
		const next = [ ...items ];
		const [ item ] = next.splice( dragged, 1 );
		next.splice( target, 0, item );
		onChange( next );
		setDragged( target );
	};
	const moveBy = ( index, direction ) => {
		const target = index + direction;
		if ( target < 0 || target >= items.length ) {
			return;
		}
		const next = [ ...items ];
		[ next[ index ], next[ target ] ] = [ next[ target ], next[ index ] ];
		onChange( next );
	};
	return (
		<div className="prta-dynamic-fields">
			{ items.map( ( item, index ) => (
				<div
					className="prta-dynamic-field"
					key={ item.id }
					draggable
					onDragStart={ () => setDragged( index ) }
					onDragOver={ ( event ) => {
						event.preventDefault();
						move( index );
					} }
					onDragEnd={ () => setDragged( null ) }
				>
					<span
						className="prta-drag-handle"
						aria-hidden="true"
						title={ __( 'Drag to reorder', 'well-product-table' ) }
					>
						⠿
					</span>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						aria-label={ sprintf(
							/* translators: %s: column or filter name. */
							__( 'Title for %s', 'well-product-table' ),
							item.label
						) }
						value={ item.label }
						onChange={ ( label ) =>
							onChange(
								items.map( ( current ) =>
									current.id === item.id
										? { ...current, label }
										: current
								)
							)
						}
					/>
					<code>{ item.value }</code>
					<div className="prta-field-order">
						<Button
							icon="arrow-up-alt2"
							label={ sprintf(
								/* translators: %s: column or filter name. */
								__( 'Move %s up', 'well-product-table' ),
								item.label
							) }
							disabled={ index === 0 }
							onClick={ () => moveBy( index, -1 ) }
						/>
						<Button
							icon="arrow-down-alt2"
							label={ sprintf(
								/* translators: %s: column or filter name. */
								__( 'Move %s down', 'well-product-table' ),
								item.label
							) }
							disabled={ index === items.length - 1 }
							onClick={ () => moveBy( index, 1 ) }
						/>
					</div>
					<Button
						className="prta-remove-field"
						icon="dismiss"
						label={ sprintf(
							/* translators: %s: column or filter name. */
							__( 'Remove %s', 'well-product-table' ),
							item.label
						) }
						onClick={ () =>
							onChange(
								items.filter(
									( current ) => current.id !== item.id
								)
							)
						}
					/>
				</div>
			) ) }
			<div className="prta-field-add">
				<SelectControl
					label={ __(
						'Add a column or filter',
						'well-product-table'
					) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					value={ selected }
					onChange={ setSelected }
					options={ [
						{ value: '', label: placeholder },
						...options.filter(
							( option ) =>
								! items.some(
									( item ) => item.value === option.value
								)
						),
					] }
				/>
				<Button
					__next40pxDefaultSize
					variant="secondary"
					icon="plus"
					disabled={ ! selected }
					onClick={ add }
				>
					{ __( 'Add', 'well-product-table' ) }
				</Button>
			</div>
		</div>
	);
};

const Section = ( { title, description, children } ) => (
	<section className="prta-editor-section">
		<div className="prta-editor-section-heading">
			<Heading level={ 4 }>{ title }</Heading>
			{ description && <Text variant="muted">{ description }</Text> }
		</div>
		<div className="prta-editor-fields">{ children }</div>
	</section>
);

const Single = ( { tableId, onTableIdResolved } ) => {
	const [ settings, setSettings ] = useState( defaults );
	const [ activeTableId, setActiveTableId ] = useState( tableId );
	const [ postStatus, setPostStatus ] = useState( 'publish' );
	const [ loading, setLoading ] = useState( true );
	const [ saving, setSaving ] = useState( false );
	const [ snackbar, setSnackbar ] = useState( null );
	const [ copied, setCopied ] = useState( false );
	const set = ( key, value ) =>
		setSettings( ( current ) => ( { ...current, [ key ]: value } ) );

	useEffect( () => {
		let active = true;
		setActiveTableId( tableId );
		setLoading( true );
		Promise.all( [
			wp.apiFetch( { path: '/prta/v1/settings' } ),
			tableId
				? wp.apiFetch( {
						path: `${ API_PATH }/${ tableId }?context=edit`,
				  } )
				: Promise.resolve( null ),
		] )
			.then( ( [ globalSettings, post ] ) => {
				if ( ! active ) {
					return;
				}
				const tableDefaults = {
					...defaults,
					productsPerPage: globalSettings.productsPerPage,
					descriptionLength: globalSettings.descriptionLength,
				};
				if ( ! post ) {
					setSettings( tableDefaults );
					setPostStatus( 'publish' );
					return;
				}
				setPostStatus( post.status );
				let saved = {};
				try {
					saved = JSON.parse( post.content?.raw || '{}' );
				} catch ( error ) {
					saved = {};
				}
				setSettings( {
					...tableDefaults,
					...saved,
					sortBy:
						saved.sortBy === 'sorting'
							? 'default'
							: saved.sortBy || defaults.sortBy,
					tableName: post.title?.raw || saved.tableName || '',
					columns: normalizeItems(
						saved.columns ?? defaults.columns,
						COLUMN_OPTIONS
					),
					searchFilters: normalizeItems(
						saved.searchFilters ??
							saved.searchFilter ??
							defaults.searchFilters,
						FILTER_OPTIONS
					),
				} );
			} )
			.catch( ( error ) => {
				if ( active ) {
					setSnackbar( { type: 'error', message: error.message } );
				}
			} )
			.finally( () => {
				if ( active ) {
					setLoading( false );
				}
			} );
		return () => {
			active = false;
		};
	}, [ tableId ] );

	const saveSettings = async () => {
		if ( ! settings.tableName.trim() ) {
			setSnackbar( {
				type: 'error',
				message: __(
					'Please enter a table name.',
					'well-product-table'
				),
			} );
			return;
		}
		if ( ! settings.columns.length ) {
			setSnackbar( {
				type: 'error',
				message: __(
					'Select at least one table column.',
					'well-product-table'
				),
			} );
			return;
		}
		setSaving( true );
		setSnackbar( null );
		try {
			const path = activeTableId
				? `${ API_PATH }/${ activeTableId }`
				: API_PATH;
			const savedPost = await wp.apiFetch( {
				path,
				method: 'POST',
				data: {
					title: settings.tableName.trim(),
					content: JSON.stringify( settings ),
					status: postStatus,
				},
			} );
			setActiveTableId( savedPost.id );
			onTableIdResolved?.( savedPost.id );
			setSnackbar( {
				type: 'success',
				message: activeTableId
					? __( 'Table updated successfully.', 'well-product-table' )
					: __( 'Table created successfully.', 'well-product-table' ),
			} );
		} catch ( requestError ) {
			setSnackbar( {
				type: 'error',
				message:
					requestError.message ||
					__( 'Unable to save table.', 'well-product-table' ),
			} );
		} finally {
			setSaving( false );
		}
	};
	const shortcode = activeTableId
		? `[product_table id="${ activeTableId }"]`
		: __( 'Available after saving', 'well-product-table' );
	const copyShortcode = async () => {
		if ( activeTableId ) {
			await navigator.clipboard.writeText( shortcode );
			setCopied( true );
		}
	};

	if ( loading ) {
		return (
			<Card
				className="prta-editor-card"
				style={ { margin: '20px 20px 20px 0' } }
			>
				<CardBody>
					<Spinner />
				</CardBody>
			</Card>
		);
	}

	return (
		<Card
			className="prta-editor-card"
			style={ { margin: '20px 20px 20px 0' } }
		>
			<CardBody>
				{ snackbar && (
					<div
						style={ {
							position: 'fixed',
							right: '32px',
							bottom: '32px',
							zIndex: 100000,
						} }
					>
						<Snackbar
							className={ `adpro-snackbar is-${ snackbar.type }` }
							explicitDismiss={ snackbar.type === 'error' }
							onRemove={ () => setSnackbar( null ) }
						>
							{ snackbar.type === 'success'
								? __( 'Success:', 'well-product-table' )
								: __( 'Error:', 'well-product-table' ) }
							{ snackbar.message }
						</Snackbar>
					</div>
				) }
				<Section
					title={
						activeTableId
							? __( 'Edit Table', 'well-product-table' )
							: __( 'Add New Table', 'well-product-table' )
					}
				>
					<TextControl
						label={ __( 'Table Name', 'well-product-table' ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						value={ settings.tableName }
						onChange={ ( value ) => set( 'tableName', value ) }
					/>
				</Section>
				<Section title={ __( 'Display In', 'well-product-table' ) }>
					<RadioControl
						label={ __( 'Display In', 'well-product-table' ) }
						hideLabelFromVision
						selected={ settings.displayIn }
						onChange={ ( value ) => set( 'displayIn', value ) }
						options={ [
							{
								label: __(
									'Display Using Shortcode',
									'well-product-table'
								),
								value: 'shortcode',
							},
							{
								label: __(
									'Display on Shop Specific Page',
									'well-product-table'
								),
								value: 'shop',
							},
						] }
					/>
					{ settings.displayIn === 'shortcode' ? (
						<>
							<div className="prta-shortcode-control">
								<TextControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									label={ __(
										'Shortcode',
										'well-product-table'
									) }
									value={ shortcode }
									readOnly
								/>
								<Button
									className="components-clipboard-button prta-copy-shortcode"
									variant="secondary"
									icon={ copied ? 'yes' : 'admin-page' }
									label={
										copied
											? __(
													'Copied',
													'well-product-table'
											  )
											: __(
													'Copy shortcode',
													'well-product-table'
											  )
									}
									disabled={ ! activeTableId }
									onClick={ copyShortcode }
								/>
							</div>
							<div className="prta-editor-row">
								<SelectControl
									label={ __(
										'Product Query',
										'well-product-table'
									) }
									value={ settings.queryType }
									onChange={ ( value ) =>
										set( 'queryType', value )
									}
									options={ [
										{
											value: 'all',
											label: __(
												'All Products',
												'well-product-table'
											),
										},
										{
											value: 'categories',
											label: __(
												'Specific Categories',
												'well-product-table'
											),
										},
										{
											value: 'tags',
											label: __(
												'Specific Tags',
												'well-product-table'
											),
										},
										{
											value: 'products',
											label: __(
												'Specific Products',
												'well-product-table'
											),
										},
										{
											value: 'brands',
											label: __(
												'Specific Brands',
												'well-product-table'
											),
										},
									] }
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
								{ settings.queryType !== 'all' && (
									<QueryPicker
										label={ __(
											'Select items',
											'well-product-table'
										) }
										type={ settings.queryType }
										value={
											settings[
												`query${
													settings.queryType[ 0 ].toUpperCase() +
													settings.queryType.slice(
														1
													)
												}`
											] || []
										}
										onChange={ ( value ) =>
											set(
												`query${
													settings.queryType[ 0 ].toUpperCase() +
													settings.queryType.slice(
														1
													)
												}`,
												value
											)
										}
									/>
								) }
							</div>
							{ settings.queryType !== 'products' && (
								<div className="prta-editor-row">
									{ settings.queryType !== 'products' && (
										<QueryPicker
											label={ __(
												'Exclude Specific Products',
												'well-product-table'
											) }
											type="products"
											value={ settings.excludeProducts }
											onChange={ ( value ) =>
												set( 'excludeProducts', value )
											}
										/>
									) }
									{ settings.queryType === 'all' && (
										<QueryPicker
											label={ __(
												'Exclude Categories',
												'well-product-table'
											) }
											type="categories"
											value={ settings.excludeCategories }
											onChange={ ( value ) =>
												set(
													'excludeCategories',
													value
												)
											}
										/>
									) }
								</div>
							) }
						</>
					) : (
						<div className="prta-page-options">
							<CheckboxControl
								__nextHasNoMarginBottom
								label={ __(
									'Shop Page',
									'well-product-table'
								) }
								checked={ settings.shopPage }
								onChange={ ( value ) =>
									set( 'shopPage', value )
								}
							/>
							<CheckboxControl
								__nextHasNoMarginBottom
								label={ __(
									'Product Search Page',
									'well-product-table'
								) }
								checked={ settings.searchPage }
								onChange={ ( value ) =>
									set( 'searchPage', value )
								}
							/>
							<CheckboxControl
								__nextHasNoMarginBottom
								label={ __(
									'Product Category Page',
									'well-product-table'
								) }
								checked={ settings.categoryPage }
								onChange={ ( value ) =>
									set( 'categoryPage', value )
								}
							/>
							<CheckboxControl
								__nextHasNoMarginBottom
								label={ __(
									'Product Tag Page',
									'well-product-table'
								) }
								checked={ settings.tagPage }
								onChange={ ( value ) =>
									set( 'tagPage', value )
								}
							/>
							<CheckboxControl
								__nextHasNoMarginBottom
								label={ __(
									'Product Attributes Page',
									'well-product-table'
								) }
								checked={ settings.attributesPage }
								onChange={ ( value ) =>
									set( 'attributesPage', value )
								}
							/>
							<CheckboxControl
								__nextHasNoMarginBottom
								label={ __(
									'Product Brand Page',
									'well-product-table'
								) }
								checked={ settings.brandPage }
								onChange={ ( value ) =>
									set( 'brandPage', value )
								}
							/>
						</div>
					) }
				</Section>
				<Section title={ __( 'Columns', 'well-product-table' ) }>
					<DynamicFieldList
						items={ settings.columns }
						options={ COLUMN_OPTIONS }
						placeholder={ __(
							'Choose a Column',
							'well-product-table'
						) }
						onChange={ ( value ) => set( 'columns', value ) }
					/>
				</Section>
				<Section title={ __( 'Others', 'well-product-table' ) }>
					<ToggleControl
						__nextHasNoMarginBottom
						checked={ settings.quantitySelector }
						onChange={ ( value ) =>
							set( 'quantitySelector', value )
						}
						label={ __(
							'Enable Quantity Selector',
							'well-product-table'
						) }
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'Variation Display Style',
							'well-product-table'
						) }
						value={ settings.variationStyle }
						options={ [
							{
								value: 'link',
								label: __(
									'Read more link to product page',
									'well-product-table'
								),
							},
							{
								value: 'dropdown',
								label: __(
									'Display variations as dropdown',
									'well-product-table'
								),
							},
							{
								value: 'separate',
								label: __(
									'Display variations as separate rows',
									'well-product-table'
								),
							},
						] }
						onChange={ ( value ) => set( 'variationStyle', value ) }
					/>
					<NumberControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'Products per page',
							'well-product-table'
						) }
						value={ settings.productsPerPage }
						onChange={ ( value ) =>
							set( 'productsPerPage', Number( value ) )
						}
						min={ 1 }
					/>
				</Section>
				<Section
					title={ __( 'Search Filters', 'well-product-table' ) }
					description={ __(
						'Choose the filters to show above the table.',
						'well-product-table'
					) }
				>
					<div className="prta-search-filter-options">
						{ FILTER_OPTIONS.map( ( option ) => (
							<CheckboxControl
								key={ option.value }
								label={ option.label }
								checked={ settings.searchFilters.some(
									( item ) => item.value === option.value
								) }
								onChange={ ( checked ) =>
									set(
										'searchFilters',
										checked
											? [
													...settings.searchFilters,
													makeItem(
														option.value,
														FILTER_OPTIONS
													),
											  ]
											: settings.searchFilters.filter(
													( item ) =>
														item.value !==
														option.value
											  )
									)
								}
								__nextHasNoMarginBottom
							/>
						) ) }
					</div>
					<div className="prta-editor-row">
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Sort By', 'well-product-table' ) }
							value={ settings.sortBy }
							options={ [
								{
									label: __(
										'Default WooCommerce',
										'well-product-table'
									),
									value: 'default',
								},
								{
									label: __( 'ID', 'well-product-table' ),
									value: 'id',
								},
								{
									label: __( 'Name', 'well-product-table' ),
									value: 'name',
								},
								{
									label: __(
										'Published',
										'well-product-table'
									),
									value: 'published',
								},
								{
									label: __(
										'Modified',
										'well-product-table'
									),
									value: 'modified',
								},
								{
									label: __( 'Sales', 'well-product-table' ),
									value: 'sales',
								},
								{
									label: __( 'Rating', 'well-product-table' ),
									value: 'rating',
								},
								{
									label: __( 'Random', 'well-product-table' ),
									value: 'random',
								},
								{
									label: __( 'Price', 'well-product-table' ),
									value: 'price',
								},
							] }
							onChange={ ( value ) => set( 'sortBy', value ) }
						/>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Sort Direction',
								'well-product-table'
							) }
							value={ settings.sortDirection }
							options={ [
								{
									label: __(
										'Automatic',
										'well-product-table'
									),
									value: 'automatic',
								},
								{
									label: __(
										'Ascending',
										'well-product-table'
									),
									value: 'ascending',
								},
								{
									label: __(
										'Descending',
										'well-product-table'
									),
									value: 'descending',
								},
							] }
							onChange={ ( value ) =>
								set( 'sortDirection', value )
							}
						/>
					</div>
				</Section>
				<Section
					title={ __( 'Content', 'well-product-table' ) }
					description={ __(
						'Settings for table actions and descriptions.',
						'well-product-table'
					) }
				>
					<NumberControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'Description Length (Words)',
							'well-product-table'
						) }
						value={ settings.descriptionLength }
						onChange={ ( value ) =>
							set( 'descriptionLength', Number( value ) )
						}
						min={ 0 }
					/>
					<div className="prta-editor-actions">
						<Button
							icon="saved"
							variant="primary"
							onClick={ saveSettings }
							isBusy={ saving }
							disabled={ saving }
						>
							{ saving
								? __( 'Saving…', 'well-product-table' )
								: __( 'Save Table', 'well-product-table' ) }
						</Button>
					</div>
				</Section>
			</CardBody>
		</Card>
	);
};
export default Single;
