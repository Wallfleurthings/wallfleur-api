const express = require('express');
const { route } = require('../app');
const multer = require('multer');
const router = new express.Router();

const homepage = require('../controllers/homepage.js');
const product = require('../controllers/product.js');
const category = require('../controllers/category.js');
const customer = require('../controllers/customer.js');
const bag = require('../controllers/bag.js');
const payment = require('../controllers/payment.js');
const admin = require('../controllers/adminuser');
const order = require('../controllers/order');
const advertisement = require('../controllers/advertisement');
const newsletter = require('../controllers/newsletter');
const contactus = require('../controllers/contactus');

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

router.get('/health', function(req,res){
    res.send('OK');
})


router.get('/homepage', homepage.get_homedata)
router.get('/search', homepage.search)
router.get('/category', category.get_all_category)
router.get('/category/:slug', category.get_category_product)
router.get('/product', product.get_all_product)
router.get('/all-product', product.get_all_product_website)
router.get('/order', order.get_all_order)
router.get('/download-order', order.get_orders_by_filter_for_invoice)
router.get('/export-order-list', order.get_orders_export_list)
router.get('/product/:slug', product.get_product)
router.get('/alternate-product/:slug', product.get_alternate_product)
router.get('/bag', bag.check_bag)
router.get('/profile', customer.profile)

router.get('/manage-product', product.manage_get_all_product)
router.get('/product-detail/:id', product.get_product_with_id)
router.get('/manage-category', category.manage_get_all_category)
router.get('/category-id', category.get_category_id)
router.get('/category-detail/:id', category.get_category_with_id)
router.get('/manage-customer', customer.manage_get_all_customer)
router.get('/customer', customer.get_all_customer)
router.get('/customer-detail/:id', customer.get_customer_with_id)
router.get('/manage-orders', order.manage_get_all_orders)
router.get('/order-detail/:id', order.get_order_with_id)
router.post('/order-update', order.upsertOrder)
router.get('/search-order-product', order.search_all_product)
router.get('/orders', order.get_orders_by_customer_id)
router.get('/manage-advertisement', advertisement.manage_get_all_advertisement)
router.get('/advertisement-detail/:_id', advertisement.get_advertisement_with_id)
router.post('/add-advertisement', upload.single('image'), advertisement.add_advertisement);

router.post('/register', customer.register_customer)
router.post('/verify-otp', customer.verifyOtp)
router.post('/login', customer.user_login)
router.post('/save-address', customer.save_address)
router.post('/addtobag', bag.addtobag)
router.post('/cartCount', bag.cartCount)
router.post('/check-products', bag.check_products)
router.post('/removefrombag', bag.removefrombag)
router.post('/createOrder', payment.createOrder)
router.post('/verifyPayment', payment.verifyPayment)
router.post('/createPayPalOrder', payment.createPayPalOrder)
router.post('/capturePayPalPayment', payment.capturePayPalPayment)
router.post('/addAdmin', admin.addAdminUser)
router.post('/reduce-quantity', product.reduce_quantity)    
router.post('/restore-quantity', product.restore_quantity)    
router.post('/set-international-session', homepage.set_international_session)
router.post('/get-international-session', homepage.get_international_session)

router.post('/delete-api', admin.delete_api)
router.post('/manage-delete-api', admin.manage_delete_api)
router.post('/addProduct', product.add_product)
router.post('/addProductImages', upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
    { name: 'image5', maxCount: 1 },
    { name: 'image6', maxCount: 1 }
  ]), product.add_product_image);
  
router.post('/addCategory', category.add_category)
router.post('/addImageCategory', upload.single('categoryImage'), category.add_category_image);
router.post('/addCustomer', customer.add_customer)
router.post('/updateCustomer', customer.update_website_customer)
router.post('/forgot-password', customer.forgotPassword)
router.post('/reset-password', customer.resetPassword)
router.post('/contact-us', customer.contact_us)
router.post('/subscribe', customer.newsletter)
router.post('/checkAdmin', admin.check_adminuser)

router.get('/search-product', product.get_products_by_search)
router.get('/search-category', category.get_category_by_search)
router.get('/search-customer', customer.get_customer_by_search)
router.get('/search-order', order.get_order_by_search)

router.get('/manage-newsletter', newsletter.manage_get_all_newsletter)
router.get('/send-newsletter', newsletter.send_newsletter)
router.get('/manage-contactus', contactus.manage_get_all_contactus)
router.post('/support-reply', contactus.reply_support)


module.exports = router
