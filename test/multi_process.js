let child_process = require('child_process'),
    path = require('path'),
    Disruptor = require('..').Disruptor,
    expect = require('chai').expect,
    async = require('async');

function many(num_producers, num_consumers, num_elements_to_write)
{
describe('multi-process many-to-many (producers: ' + num_producers + ', consumers: ' + num_consumers + ', elements to write: ' + num_elements_to_write + ')', function ()
{
    this.timeout(5 * 60 * 1000);

    it('should transfer data', function (done)
    {
        (new Disruptor('/test', 100000, 256, num_consumers, 0, true, true)).release();

        let csums = null, psums = null;

        function check()
        {
            if (csums && psums)
            {
                let sum = 0;
                for (let s of psums)
                {
                    sum += s;
                }

                for (let s of csums)
                {
                    expect(s).to.equal(sum);
                }

                done();
            }
        }

        async.times(num_consumers, async.ensureAsync(function (n, next)
        {
            child_process.fork(
                    path.join(__dirname, 'fixtures', 'consumer.js'),
                    ['--num_producers', num_producers,
                     '--num_consumers', num_consumers,
                     '--num_elements_to_write', num_elements_to_write,
                     '--n', n]).on('message', function (sum)
            {
                next(null, sum);
            });
        }), function (err, sums)
        {
            if (err) { return done(err); }
            csums = sums;
            check();
        });

        async.times(num_producers, async.ensureAsync(function (n, next)
        {
            child_process.fork(
                    path.join(__dirname, 'fixtures', 'producer.js'),
                    ['--num_consumers', num_consumers,
                     '--num_elements_to_write', num_elements_to_write]).on('message', function (sum)
            {
                next(null, sum);
            });
        }), function (err, sums)
        {
            if (err) { return done(err); }
            psums = sums;
            check();
        });
    });
});
}

for (let num_producers of [1, 2, 4])
{
    for (let num_consumers of [1, 2, 4])
    {
        for (let num_elements_to_write of [1, 2, 10, 100, 1000])
        {
            many(num_producers, num_consumers, num_elements_to_write);
        }
    }
}