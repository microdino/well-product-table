const { __ } = wp.i18n;
import { useEffect, useState } from 'react';
import {
	Button,
	Card,
	CardBody,
	CheckboxControl,
	Notice,
	SelectControl,
	Spinner,
	TextControl,
	ToggleControl,
	__experimentalHeading as Heading,
	__experimentalNumberControl as NumberControl,
	__experimentalText as Text,
} from '@wordpress/components';

const SettingsSection = ( { title, description, children } ) => (
	<section className="prta-editor-section">
		<div className="prta-editor-section-heading">
			<Heading level={ 3 }>{ title }</Heading>
			<Text variant="muted">{ description }</Text>
		</div>
		<div className="prta-editor-fields">{ children }</div>
	</section>
);

const Settings = () => {
	const [ settings, setSettings ] = useState( {} );
	const [ loading, setLoading ] = useState( true );
	const [ ready, setReady ] = useState( false );
	const [ saving, setSaving ] = useState( false );
	const [ notice, setNotice ] = useState( null );
	useEffect( () => {
		wp.apiFetch( { path: '/prta/v1/settings' } )
			.then( ( saved ) => {
				setSettings( saved );
				setReady( true );
			} )
			.catch( ( error ) =>
				setNotice( { status: 'error', message: error.message } )
			)
			.finally( () => setLoading( false ) );
	}, [] );
	const set = ( key, value ) =>
		setSettings( ( current ) => ( { ...current, [ key ]: value } ) );
	const saveSettings = async () => {
		setSaving( true );
		setNotice( null );
		try {
			const saved = await wp.apiFetch( {
				path: '/prta/v1/settings',
				method: 'POST',
				data: settings,
			} );
			setSettings( saved );
			setNotice( {
				status: 'success',
				message: __( 'Settings saved.', 'well-product-table' ),
			} );
		} catch ( error ) {
			setNotice( { status: 'error', message: error.message } );
		} finally {
			setSaving( false );
		}
	};
	const toggle = ( key, label ) => (
		<ToggleControl
			__nextHasNoMarginBottom
			label={ label }
			checked={ Boolean( settings[ key ] ) }
			onChange={ ( value ) => set( key, value ) }
		/>
	);
	const saveButton = (
		<Button
			icon="saved"
			variant="primary"
			isBusy={ saving }
			onClick={ saveSettings }
		>
			{ __( 'Save Settings', 'well-product-table' ) }
		</Button>
	);
	return (
		<Card style={ { margin: '20px 20px 20px 0' } }>
			<CardBody>
				{ notice && (
					<Notice
						status={ notice.status }
						onRemove={ () => setNotice( null ) }
					>
						{ notice.message }
					</Notice>
				) }
				{ loading && <Spinner /> }
				<fieldset
					disabled={ loading || saving || ! ready }
					style={ { border: 0, margin: 0, padding: 0, minWidth: 0 } }
				>
					<SettingsSection
						title={ __(
							'Add to Cart Settings',
							'well-product-table'
						) }
						description={ __(
							'Customize purchase controls for shortcode and shop page tables.',
							'well-product-table'
						) }
					>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Add to Cart Text',
								'well-product-table'
							) }
							value={ settings.addToCartText ?? '' }
							onChange={ ( v ) => set( 'addToCartText', v ) }
						/>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Multiple Add to Cart Text (Singular)',
								'well-product-table'
							) }
							help={ __(
								'Use {items} for quantity and {total} for the selected products’ total.',
								'well-product-table'
							) }
							value={ settings.multipleAddToCartSingular ?? '' }
							onChange={ ( v ) =>
								set( 'multipleAddToCartSingular', v )
							}
						/>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Multiple Add to Cart Text (Plural)',
								'well-product-table'
							) }
							help={ __(
								'Use {items} for quantity and {total} for the selected products’ total.',
								'well-product-table'
							) }
							value={ settings.multipleAddToCartPlural ?? '' }
							onChange={ ( v ) =>
								set( 'multipleAddToCartPlural', v )
							}
						/>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Add to Cart Location',
								'well-product-table'
							) }
							help={ __(
								'Position of the button for adding selected products.',
								'well-product-table'
							) }
							value={ settings.addToCartLocation ?? 'above' }
							onChange={ ( v ) => set( 'addToCartLocation', v ) }
							options={ [
								{
									value: 'above',
									label: __(
										'Above Table',
										'well-product-table'
									),
								},
								{
									value: 'below',
									label: __(
										'Below Table',
										'well-product-table'
									),
								},
								{
									value: 'all',
									label: __(
										'Above & Below Table',
										'well-product-table'
									),
								},
							] }
						/>
						{ toggle(
							'selectAllProducts',
							__(
								'Select all products in the table header',
								'well-product-table'
							)
						) }
					</SettingsSection>
					<SettingsSection
						title={ __(
							'Table Content Settings',
							'well-product-table'
						) }
						description={ __(
							'Control table headings, product visibility, and content defaults.',
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
							help={ __(
								'Default for new tables and tables without a saved description length. Individual table settings take precedence.',
								'well-product-table'
							) }
							value={ settings.descriptionLength ?? 15 }
							min={ 0 }
							onChange={ ( v ) => set( 'descriptionLength', v ) }
						/>
						{ toggle(
							'stickyHeader',
							__( 'Show sticky header', 'well-product-table' )
						) }
						{ toggle(
							'hideTableHeading',
							__( 'Hide table heading', 'well-product-table' )
						) }
						{ toggle(
							'showTableFooter',
							__( 'Show table footer', 'well-product-table' )
						) }
						{ toggle(
							'showHiddenProducts',
							__( 'Show hidden products', 'well-product-table' )
						) }
						{ toggle(
							'selectAllProducts',
							__(
								'Select all products in the table header',
								'well-product-table'
							)
						) }
					</SettingsSection>
					<SettingsSection
						title={ __( 'Other Settings', 'well-product-table' ) }
						description={ __(
							'Set pagination defaults, search, caching, and uninstall behavior.',
							'well-product-table'
						) }
					>
						<NumberControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Products per page',
								'well-product-table'
							) }
							help={ __(
								'Default for new tables and tables without a saved page size. Individual table settings take precedence.',
								'well-product-table'
							) }
							value={ settings.productsPerPage ?? 20 }
							min={ 1 }
							onChange={ ( v ) => set( 'productsPerPage', v ) }
						/>
						{ toggle(
							'showSearchBox',
							__(
								'Search box in table header',
								'well-product-table'
							)
						) }
						<CheckboxControl
							__nextHasNoMarginBottom
							label={ __(
								'Permanently delete all Well Product Table settings and data when deleting the plugin',
								'well-product-table'
							) }
							help={ __(
								'Unchecked by default. Applies only when the plugin is deleted, not when it is deactivated.',
								'well-product-table'
							) }
							checked={ Boolean(
								settings.deleteDataOnUninstall
							) }
							onChange={ ( v ) =>
								set( 'deleteDataOnUninstall', v )
							}
						/>
						{ toggle(
							'enableCaching',
							__( 'Enable Caching', 'well-product-table' )
						) }
						<NumberControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Cache Duration (Hours)',
								'well-product-table'
							) }
							value={ settings.cacheDuration ?? 10 }
							min={ 1 }
							disabled={ ! settings.enableCaching }
							onChange={ ( v ) => set( 'cacheDuration', v ) }
						/>
					</SettingsSection>
					<div className="prta-settings-actions">
						<div className="prta-editor-actions">
							{ saveButton }
						</div>
					</div>
				</fieldset>
			</CardBody>
		</Card>
	);
};
export default Settings;
