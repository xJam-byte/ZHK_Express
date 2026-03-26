UPDATE orders SET shop_id = (SELECT selected_shop_id FROM users WHERE users.id = orders.user_id) WHERE shop_id IS NULL;
